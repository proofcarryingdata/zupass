import { Menu } from "@grammyjs/menu";
import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { sleep } from "@pcd/util";
import { Bot, session } from "grammy";
import { fetchSemaphoreIdFromTelegramUsername } from "../database/queries/telegram/fetchSemaphoreId";
import { fetchTelegramConversationsByChatId } from "../database/queries/telegram/fetchTelegramConversation";
import { updateTelegramUsername } from "../database/queries/telegram/insertTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import {
  BotContext,
  SessionData,
  getSessionKey,
  isDirectMessage
} from "../util/telegramHelpers";
import { RollbarService } from "./rollbarService";

const PASSPORT_CLIENT_URL =
  process.env.PASSPORT_CLIENT_URL || "https://dev.local:3000";
const PASSPORT_SERVER_URL =
  process.env.PASSPORT_SERVER_URL || "https://dev.local:3002";
const KUDOSBOT_UPLOAD_URL = PASSPORT_SERVER_URL + "/kudos/upload";

export class KudosbotService {
  private context: ApplicationContext;
  private bot: Bot<BotContext>;
  private rollbarService: RollbarService | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    bot: Bot<BotContext>
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.bot = bot;

    this.bot.api.setMyDescription("I'm Kudosbot!");

    this.bot.api.setMyShortDescription("Kudosbot enables anonymous kudos");

    const getProofUrl = (
      zupassClientUrl: string,
      returnUrl: string,
      messageToSign: string
    ): string => {
      const args = {
        identity: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDPackage.name,
          value: undefined,
          userProvided: true
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: messageToSign,
          userProvided: false
        }
      };
      const req: PCDGetRequest = {
        type: PCDRequestType.Get,
        returnUrl,
        args,
        pcdType: SemaphoreSignaturePCDPackage.name
      };
      const encReq = encodeURIComponent(JSON.stringify(req));
      const proofUrl = `${zupassClientUrl}/#prove?request=${encReq}`;
      return proofUrl;
    };

    const kudosbotMenu = new Menu<BotContext>("kudos");
    kudosbotMenu.dynamic((ctx, menu) => {
      if (ctx.session.kudosData) {
        const { senderSemaphoreId, recipientSemaphoreId, recipientUsername } =
          ctx.session.kudosData;
        const proofUrl = getProofUrl(
          PASSPORT_CLIENT_URL,
          KUDOSBOT_UPLOAD_URL,
          `KUDOS:${senderSemaphoreId}:${recipientSemaphoreId}`
        );
        menu.webApp(`Send kudos to @${recipientUsername}`, proofUrl);
      } else {
        ctx.reply("Kudosbot encountered an error.");
      }
      return menu;
    });
    this.bot.use(kudosbotMenu);

    this.bot.command("start", async (ctx) => {
      logger("[KUDOSBOT] start command called");
      await ctx.reply("hello");
    });

    this.bot.command("kudos", async (ctx) => {
      const kudosGiver = ctx.from?.username;
      const payload = ctx.match;
      if (payload.length === 0) {
        return ctx.reply(
          "Please enter the kudos receiver's Telegram handle after the kudos command."
        );
      }
      let kudosReceiver = payload;
      if (kudosReceiver[0] === "@") {
        kudosReceiver = kudosReceiver.substring(1);
      }
      logger(
        `[KUDOSBOT] kudos command called; username: ${kudosGiver}, kudosReceiver: ${kudosReceiver}`
      );

      try {
        if (isDirectMessage(ctx) && kudosGiver) {
          // look up kudos receiever handle in db to see if it's a valid telegram handle to receieve kudos
          const kudosGiverSemaphoreId =
            await fetchSemaphoreIdFromTelegramUsername(
              this.context.dbPool,
              kudosGiver
            );
          if (!kudosGiverSemaphoreId) {
            return await ctx.reply(
              "Error retrieving your Zupass information. Please make sure to join the group before sending a kudos."
            );
          }
          const kudosReceiverSemaphoreId =
            await fetchSemaphoreIdFromTelegramUsername(
              this.context.dbPool,
              kudosReceiver
            );
          if (!kudosReceiverSemaphoreId) {
            return await ctx.reply(
              "Error retrieving recipient's Zupass information. Please enter a valid kudos recipient handle for a user in the group."
            );
          }
          ctx.session.kudosData = {
            senderSemaphoreId: kudosGiverSemaphoreId,
            recipientSemaphoreId: kudosReceiverSemaphoreId,
            recipientUsername: kudosReceiver
          };
          await ctx.reply("Send a kudos by pressing on the button.", {
            reply_markup: kudosbotMenu
          });
        }
      } catch (e) {
        logger("[KUDOSBOT] kudos error", e);
        this.rollbarService?.reportError(e);
      }
    });

    this.bot.command("refresh", async (ctx) => {
      const payload = ctx.match;
      const chatId = Number(payload);
      const telegramConversations = await fetchTelegramConversationsByChatId(
        this.context.dbPool,
        chatId
      );
      if (telegramConversations.length === 0) {
        return await ctx.reply(
          "Error fetching conversations for given telegram chat id"
        );
      }
      await ctx.reply("Running username refresh");
      logger(
        `[KUDOSBOT] running username refresh for telegram chat id ${chatId}`
      );
      for (const telegramConversation of telegramConversations) {
        const chatId = telegramConversation.telegram_chat_id;
        const userId = telegramConversation.telegram_user_id;
        try {
          const { user } = await ctx.api.getChatMember(chatId, userId);
          const username = user.username;
          if (username && username.length > 0) {
            logger(
              `[KUDOSBOT] updating telegram user id ${userId} to have username ${username}`
            );
            await updateTelegramUsername(
              this.context.dbPool,
              userId.toString(),
              username
            );
          } else {
            logger(
              `[KUDOSBOT] unable to update telegram user id ${userId} because they do not have a username`
            );
          }
        } catch (e) {
          logger(
            `[KUDOSBOT] error refreshing username for telegram user id ${userId}`,
            e
          );
          return await ctx.reply("Error when running username refresh");
        }
      }
      await ctx.reply("Successfully finished running username refresh");
    });
  }

  /**
   * Telegram does not allow two instances of a bot to be running at once.
   * During deployment, a new instance of the app will be started before the
   * old one is shut down, so we might end up with two instances running at
   * the same time. This method allows us to delay starting the bot by an
   * amount configurable per-environment.
   *
   * Since this function awaits on bot.start(), it will likely be very long-
   * lived.
   */
  public async startBot(): Promise<void> {
    const startDelay = parseInt(process.env.TELEGRAM_BOT_START_DELAY_MS ?? "0");
    if (startDelay > 0) {
      logger(`[KUDOSBOT] Delaying bot startup by ${startDelay} milliseconds`);
      await sleep(startDelay);
    }

    logger(`[KUDOSBOT] Starting bot`);

    try {
      // This will not resolve while the bot remains running.
      await this.bot.start({
        allowed_updates: ["message"],
        onStart: (info) => {
          logger(`[KUDOSBOT] Started bot '${info.username}' successfully!`);
        }
      });
    } catch (e) {
      logger(`[KUDOSBOT] Error starting bot`, e);
      this.rollbarService?.reportError(e);
    }
  }

  public async getBotURL(): Promise<string> {
    const { username } = await this.bot.api.getMe();
    return `https://t.me/${username}`;
  }

  public stop(): void {
    this.bot.stop();
  }
}

export async function startKudosbotService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<KudosbotService | null> {
  if (!process.env.TELEGRAM_KUDOSBOT_TOKEN) {
    logger(
      `[INIT] missing TELEGRAM_KUDOSBOT_TOKEN, not instantiating Telegram service`
    );
    return null;
  }

  const bot = new Bot<BotContext>(process.env.TELEGRAM_KUDOSBOT_TOKEN);
  const initial = (): SessionData => {
    return {
      dbPool: context.dbPool,
      anonBotExists: false,
      authBotURL: "",
      anonBotURL: ""
    };
  };

  bot.use(session({ initial, getSessionKey }));
  await bot.init();

  const service = new KudosbotService(context, rollbarService, bot);
  bot.catch((error) => {
    logger(`[KUDOSBOT] Bot error`, error);
  });
  // Start the bot, but do not await on the result here.
  service.startBot();

  return service;
}
