import { EdDSATicketPCD, EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { Bot, InlineKeyboard } from "grammy";
import { fetchTelegramConversation } from "../database/queries/telegram/fetchTelegramConversation";
import { insertTelegramConversation } from "../database/queries/telegram/insertTelegramConversation";
import { markTelegramUserAsVerified } from "../database/queries/telegram/updateTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

export class TelegramService {
  private context: ApplicationContext;
  private bot: Bot;
  private privateChatId: string;

  public constructor(
    context: ApplicationContext,
    bot: Bot,
    privateChatId: string
  ) {
    this.context = context;
    this.bot = bot;
    this.privateChatId = privateChatId;

    this.bot.command("start", async (ctx) => {
      await insertTelegramConversation(this.context.dbPool, {
        telegram_chat_id: ctx.chat.id,
        telegram_user_id: ctx.message!.from.id
      });
      ctx.reply(
        "Welcome! 👋\n\nPlease verify your credentials via the Passport app, so we can add you to the correct channels.",
        {
          reply_markup: new InlineKeyboard().url(
            "Verify with Passport 🚀",
            encodeURI(
              `https://staging.pcdpass.xyz/#/get-without-proving?request=${JSON.stringify(
                {
                  type: "GetWithoutProving",
                  returnUrl: "http://localhost:3000/verify", // TODO: Prod
                  pcdType: "eddsa-ticket-pcd"
                }
              )}`
            )
          )
        }
      );
    });

    bot.start();
  }

  public async getBotURL(): Promise<string> {
    const { username } = await this.bot.api.getMe();
    return `https://t.me/${username}`;
  }

  public async verifyEdDSATicket(
    serializedEdDSATicket: string,
    telegramUserId: number
  ): Promise<boolean> {
    let pcd: EdDSATicketPCD;

    try {
      pcd = await EdDSATicketPCDPackage.deserialize(
        JSON.parse(serializedEdDSATicket).pcd
      );
    } catch (e) {
      throw new Error(`Deserialization error, ${e}`);
    }
    const verified = await EdDSATicketPCDPackage.verify(pcd);
    if (verified) {
      const telegramConversation = await fetchTelegramConversation(
        this.context.dbPool,
        telegramUserId
      );
      if (!telegramConversation) {
        throw new Error(`Telegram account has not started chat`);
      }
      await markTelegramUserAsVerified(this.context.dbPool, telegramUserId);
      const inviteLink = await this.bot.api.createChatInviteLink(
        this.privateChatId,
        {
          creates_join_request: true,
          name: "test invite link"
        }
      );
      await this.bot.api.sendMessage(
        telegramConversation.telegram_chat_id,
        "You are verified 🫡! Here is your invite link to SBC Research Workshop.",
        {
          reply_markup: new InlineKeyboard().url(
            "Join SBC Research Workshop channel",
            inviteLink.invite_link
          )
        }
      );
    }

    return verified;
  }
}

export async function startTelegramService(
  context: ApplicationContext
): Promise<TelegramService | null> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    logger(
      `[INIT] missing TELEGRAM_BOT_TOKEN, not instantiating Telegram service`
    );
    return null;
  }
  if (!process.env.TELEGRAM_PRIVATE_CHAT_ID) {
    logger(
      `[INIT] missing TELEGRAM_PRIVATE_CHAT_ID, not instantiating Telegram service`
    );
    return null;
  }

  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
  await bot.init();

  return new TelegramService(
    context,
    bot,
    process.env.TELEGRAM_PRIVATE_CHAT_ID
  );
}
