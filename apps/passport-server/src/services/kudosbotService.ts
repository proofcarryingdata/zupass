import { Menu } from "@grammyjs/menu";
import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { sleep } from "@pcd/util";
import { Bot, session } from "grammy";
import { sqlQuery } from "../database/sqlQuery";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import {
  BotContext,
  SessionData,
  getSessionKey,
  isDirectMessage
} from "../util/telegramHelpers";
import { RollbarService } from "./rollbarService";

const ZUPASS_CLIENT_URL =
  process.env.PASSPORT_CLIENT_URL || "https://dev.local:3000";
// TODO: figure out url for upload / aggregation server
const KUDOSBOT_SERVER_UPLOAD_URL = "https://dev.local:3005/upload";

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
        const kudosGiver = ctx.session.kudosData?.giver;
        const kudosReceiver = ctx.session.kudosData?.receiver;
        const proofUrl = getProofUrl(
          ZUPASS_CLIENT_URL,
          KUDOSBOT_SERVER_UPLOAD_URL,
          `KUDOS:${kudosGiver}:${kudosReceiver}`
        );
        menu.webApp("Send kudos", proofUrl);
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

    const getSemaphoreIdFromTelegramUsername = async (
      telegramUsername: string
    ): Promise<string | null> => {
      const result = await sqlQuery(
        this.context.dbPool,
        `\
        select semaphore_id from telegram_bot_conversations
        where telegram_username = $1
        `,
        [telegramUsername]
      );
      if (result.rowCount == 0) {
        return null;
      }
      const semaphoreId: string = result.rows[0].semaphore_id;
      return semaphoreId;
    };

    this.bot.command("test", async (ctx) => {
      logger("[KUDOSBOT] test command called");
      const userId = ctx?.from?.id;
      try {
        if (isDirectMessage(ctx) && userId) {
          const chatMember = await ctx.api.getChatMember(ctx.chat.id, userId);
          const username2 = chatMember.user.username;
          logger(
            `[KUDOSBOT] chat id ${ctx.chat.id}, user id ${userId},  username ${username2}`
          );
          const username = ctx?.from?.username;
          const firstName = ctx?.from?.first_name;
          const name = firstName || username;
          await ctx.reply(`Welcome ${name}! This is a test command.`);
        }
      } catch (e) {
        logger("[KUDOSBOT] test error", e);
        this.rollbarService?.reportError(e);
      }
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
            await getSemaphoreIdFromTelegramUsername(kudosGiver);
          if (!kudosGiverSemaphoreId) {
            return await ctx.reply(
              "Error retrieving your Zupass information. Please make sure to join the group before sending a kudos."
            );
          }
          const kudosReceiverSemaphoreId =
            await getSemaphoreIdFromTelegramUsername(kudosReceiver);
          if (!kudosReceiverSemaphoreId) {
            return await ctx.reply(
              "Error retrieving recipient's Zupass information. Please enter a valid kudos recipient handle for a user in the group."
            );
          }
          ctx.session.kudosData = {
            giver: kudosGiverSemaphoreId,
            receiver: kudosReceiverSemaphoreId
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
  if (!process.env.KUDOSBOT_TELEGRAM_TOKEN) {
    logger(
      `[INIT] missing KUDOSBOT_TELEGRAM_TOKEN, not instantiating Telegram service`
    );
    return null;
  }

  const bot = new Bot<BotContext>(process.env.KUDOSBOT_TELEGRAM_TOKEN);
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
