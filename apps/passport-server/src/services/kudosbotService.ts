import { Menu } from "@grammyjs/menu";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  KudosTargetType,
  SemaphoreSignatureKudosPCD,
  SemaphoreSignatureKudosPCDArgs,
  SemaphoreSignatureKudosPCDPackage
} from "@pcd/semaphore-signature-kudos-pcd";
import { sleep } from "@pcd/util";
import { Bot, session } from "grammy";
import { fetchSemaphoreIdFromTelegramUsername } from "../database/queries/telegram/fetchSemaphoreId";
import { fetchTelegramConversationsByChatId } from "../database/queries/telegram/fetchTelegramConversation";
import { fetchTelegramUserIdFromSemaphoreId } from "../database/queries/telegram/fetchTelegramUserId";
import { fetchTelegramUsernameFromSemaphoreId } from "../database/queries/telegram/fetchTelegramUsername";
import { insertKudosbotProof } from "../database/queries/telegram/insertKudosbotProof";
import { updateTelegramUsername } from "../database/queries/telegram/insertTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import {
  BotContext,
  KudosSessionData,
  SessionData,
  getSessionKey,
  isDirectMessage,
  isGroupWithTopics
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
      sessionData: KudosSessionData,
      watermark: string
    ): string => {
      const args: SemaphoreSignatureKudosPCDArgs = {
        identity: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDPackage.name,
          value: undefined,
          userProvided: true
        },
        data: {
          argumentType: ArgumentTypeName.Object,
          value: {
            watermark,
            target: {
              type: KudosTargetType.User,
              user: {
                semaphoreID: sessionData.targetSemaphoreId
              }
            }
          }
        }
      };
      const proofUrl = constructZupassPcdGetRequestUrl<
        typeof SemaphoreSignatureKudosPCDPackage
      >(
        zupassClientUrl,
        returnUrl,
        SemaphoreSignatureKudosPCDPackage.name,
        args,
        {
          title: "",
          description: `Give a Kudos to @${sessionData.targetUsername} ${watermark}`,
          genericProveScreen: true
        }
      );
      return proofUrl;
    };

    const kudosbotMenu = new Menu<BotContext>("kudos");
    kudosbotMenu.dynamic((ctx, menu) => {
      if (ctx.session.kudosData) {
        menu.add();
        for (const watermark of ["❤️", "👏", "🙇‍♂️"]) {
          const proofUrl = getProofUrl(
            PASSPORT_CLIENT_URL,
            KUDOSBOT_UPLOAD_URL,
            ctx.session.kudosData,
            watermark
          );
          menu.webApp(watermark, proofUrl).add();
        }
        menu.row();
      } else {
        logger("[KUDOSBOT] session data was invalid");
        ctx.reply("Kudosbot encountered an error. Please try again.");
      }
      return menu;
    });
    this.bot.use(kudosbotMenu);

    this.bot.command("start", async (ctx) => {
      logger("[KUDOSBOT] start command called");
      await ctx.reply("hello");
    });

    this.bot.command("kudos", async (ctx) => {
      const kudosGiverUsername = ctx.from?.username;
      const payload = ctx.match;
      if (payload.length === 0) {
        return ctx.reply(
          "Please enter the kudos receiver's Telegram handle after the kudos command."
        );
      }
      let kudosTargetUsername = payload;
      if (kudosTargetUsername[0] === "@") {
        kudosTargetUsername = kudosTargetUsername.substring(1);
      }
      logger(
        `[KUDOSBOT] kudos command called; username: ${kudosGiverUsername}, kudosReceiver: ${kudosTargetUsername}`
      );

      try {
        if (isDirectMessage(ctx) && kudosGiverUsername) {
          // look up kudos receiever handle in db to see if it's a valid telegram handle to receieve kudos
          const kudosGiverSemaphoreId =
            await fetchSemaphoreIdFromTelegramUsername(
              this.context.dbPool,
              kudosGiverUsername
            );
          if (!kudosGiverSemaphoreId) {
            return await ctx.reply(
              "Error retrieving your Zupass information. Please make sure to join the group before sending a kudos."
            );
          }
          const kudosTargetSemaphoreId =
            await fetchSemaphoreIdFromTelegramUsername(
              this.context.dbPool,
              kudosTargetUsername
            );
          if (!kudosTargetSemaphoreId) {
            return await ctx.reply(
              "Error retrieving recipient's Zupass information. Please enter a valid kudos recipient handle for a user in the group."
            );
          }
          ctx.session.kudosData = {
            giverSemaphoreId: kudosGiverSemaphoreId,
            targetSemaphoreId: kudosTargetSemaphoreId,
            targetUsername: kudosTargetUsername
          };
          await ctx.reply(
            `You are giving a <b>Kudos</b> to @${kudosTargetUsername} !\n\nChoose which Kudos to give below 👇
            `,
            {
              reply_markup: kudosbotMenu,
              parse_mode: "HTML"
            }
          );
        }
      } catch (e) {
        logger("[KUDOSBOT] kudos error", e);
        this.rollbarService?.reportError(e);
      }
    });

    this.bot.command("refresh", async (ctx) => {
      if (!isGroupWithTopics(ctx.chat)) {
        return await ctx.reply(
          "Can only perform /refresh in a group with Topics enabled."
        );
      }
      const chatId = ctx.chat.id;
      const telegramConversations = await fetchTelegramConversationsByChatId(
        this.context.dbPool,
        chatId
      );
      if (telegramConversations.length == 0) {
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

  public async handleUpload(
    context: ApplicationContext,
    proof: string
  ): Promise<void> {
    const pcd: SemaphoreSignatureKudosPCD =
      await SemaphoreSignatureKudosPCDPackage.deserialize(
        JSON.parse(proof).pcd
      );

    const pcdValid = await SemaphoreSignatureKudosPCDPackage.verify(pcd);
    if (!pcdValid) {
      throw new Error("Proof is not valid");
    }

    const kudosGiverSemaphoreId =
      pcd.proof.semaphoreSignaturePCD.claim.identityCommitment;
    const kudosGiverTelegramUserId = await fetchTelegramUserIdFromSemaphoreId(
      context.dbPool,
      kudosGiverSemaphoreId
    );
    if (!kudosGiverTelegramUserId) {
      throw new Error("Sender does not yet exist");
    }

    const { target, watermark } = pcd.claim.data;
    if (target.type === KudosTargetType.Post) {
      throw new Error("Not supported yet");
    } else if (target.type === KudosTargetType.User) {
      if (!pcd.claim.data.target.user?.semaphoreID) {
        throw new Error("Kudos format is invalid");
      }
      const kudosTargetTelegramUsername =
        await fetchTelegramUsernameFromSemaphoreId(
          context.dbPool,
          pcd.claim.data.target.user.semaphoreID
        );

      await insertKudosbotProof(context.dbPool, proof);

      await this.bot.api.sendMessage(
        kudosGiverTelegramUserId,
        `Your Kudos to @${kudosTargetTelegramUsername} has been received! ${watermark}`
      );
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
