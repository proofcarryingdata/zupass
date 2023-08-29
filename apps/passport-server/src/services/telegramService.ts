import { EdDSATicketPCD, EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { Bot, InlineKeyboard } from "grammy";
import { deleteTelegramVerification } from "../database/queries/telegram/deleteTelegramVerification";
import { fetchTelegramVerificationStatus } from "../database/queries/telegram/fetchTelegramConversation";
import { fetchTelegramEvent } from "../database/queries/telegram/fetchTelegramEvent";
import { insertTelegramVerification } from "../database/queries/telegram/insertTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

export class TelegramService {
  private context: ApplicationContext;
  private bot: Bot;

  public constructor(context: ApplicationContext, bot: Bot) {
    this.context = context;
    this.bot = bot;

    // Users gain access to gated chats by requesting to join. The bot
    // receives a notification of this, and will approve requests from
    // users who have verified their possession of a matching PCD.
    // Approval of the join request is required even for users with the
    // invite link - see `creates_join_request` parameter on
    // `createChatInviteLink` API invocation below.
    this.bot.on("chat_join_request", async (ctx) => {
      const chatId = ctx.chatJoinRequest.chat.id;
      const userId = ctx.chatJoinRequest.user_chat_id;

      logger(`[TELEGRAM] Got chat join request for ${chatId} from ${userId}`);

      // Check if this user is verified for the chat in question
      const isVerified = await fetchTelegramVerificationStatus(
        this.context.dbPool,
        userId,
        chatId
      );

      if (isVerified) {
        logger(
          `[TELEGRAM] Approving chat join request for ${userId} to join ${chatId}`
        );
        this.bot.api.approveChatJoinRequest(chatId, userId);
      }
    });

    // When a user joins the channel, remove their verification, so they
    // cannot rejoin without verifying again.
    this.bot.on("chat_member", async (ctx) => {
      const newMember = ctx.update.chat_member.new_chat_member;
      if (newMember.status === "member") {
        logger(
          `[TELEGRAM] Deleting verification for user ${newMember.user.id} in chat ${ctx.chat.id}`
        );
        deleteTelegramVerification(
          this.context.dbPool,
          newMember.user.id,
          ctx.chat.id
        );
      }
    });

    // The "start" command initiates the process of invitation and approval.
    this.bot.command("start", async (ctx) => {
      // Only process the command if it comes as a private message.
      if (ctx.message) {
        const userId = ctx.message.from.id;
        ctx.reply(
          "Welcome! 👋\n\nPlease verify your credentials via the Passport app, so we can add you to the correct channels.",
          {
            reply_markup: new InlineKeyboard().url(
              "Verify with Passport 🚀",
              encodeURI(
                `${
                  process.env.PASSPORT_CLIENT_URL
                }/#/get-without-proving?request=${JSON.stringify({
                  type: "GetWithoutProving",
                  returnUrl: `${process.env.PASSPORT_SERVER_URL}/telegram/verify/${userId}`,
                  pcdType: "eddsa-ticket-pcd"
                })}`
              )
            )
          }
        );
      }
    });

    bot.start({
      allowed_updates: ["chat_join_request", "chat_member", "message"]
    });
  }

  public async getBotURL(): Promise<string> {
    const { username } = await this.bot.api.getMe();
    return `https://t.me/${username}`;
  }

  /**
   * Verify that a PCD relates to an event, and that the event has an
   * associated chat. If so, invite the user to the chat and record them
   * for later approval when they request to join.
   *
   * This is called from the /telegram/verify route.
   */
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
      logger(
        `[TELEGRAM] Verified PCD for ${telegramUserId}, event ${pcd.claim.ticket.eventId}`
      );

      const event = await fetchTelegramEvent(
        this.context.dbPool,
        pcd.claim.ticket.eventId
      );

      if (!event) {
        logger(
          `[TELEGRAM] User ${telegramUserId} attempted to use a ticket for event ${pcd.claim.ticket.eventId}, which has no matching chat`
        );
        return false;
      }

      try {
        const channel = await this.bot.api.getChat(event.telegram_chat_id);

        if (
          channel?.type !== "channel" &&
          channel?.type !== "group" &&
          channel?.type !== "supergroup"
        ) {
          logger(
            `[TELEGRAM] Event ${event.ticket_event_id} is configured with Telegram chat ${event.telegram_chat_id}, which is of incorrect type "${channel.type}"`
          );
          return false;
        }

        await insertTelegramVerification(
          this.context.dbPool,
          telegramUserId,
          event.telegram_chat_id
        );

        logger(
          `[TELEGRAM] Creating chat invite link to ${event.telegram_chat_id} for ${telegramUserId}`
        );
        const inviteLink = await this.bot.api.createChatInviteLink(
          event.telegram_chat_id,
          {
            creates_join_request: true,
            name: "test invite link"
          }
        );
        await this.bot.api.sendMessage(
          telegramUserId,
          `You are verified 🫡! Here is your invite link to ${channel.title}.`,
          {
            reply_markup: new InlineKeyboard().url(
              `Join ${channel.title} channel`,
              inviteLink.invite_link
            )
          }
        );
      } catch (e) {
        logger(
          `[TELEGRAM] Could not create or send invite link due to error: ${e}`
        );
        return false;
      }
    }

    return verified;
  }

  public stop(): void {
    this.bot.stop();
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

  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
  await bot.init();

  return new TelegramService(context, bot);
}
