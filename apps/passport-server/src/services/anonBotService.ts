import { autoRetry } from "@grammyjs/auto-retry";
import { Menu } from "@grammyjs/menu";
import { getAnonTopicNullifier } from "@pcd/passport-interface";
import { ONE_HOUR_MS } from "@pcd/util";
import { Bot, InlineKeyboard, session } from "grammy";
import { sha256 } from "js-sha256";
import { deleteTelegramChatTopic } from "../database/queries/telegram/deleteTelegramEvent";
import { fetchAnonTopicNullifier } from "../database/queries/telegram/fetchTelegramConversation";
import {
  fetchEventsPerChat,
  fetchTelegramEventsByChatId,
  fetchTelegramTopic
} from "../database/queries/telegram/fetchTelegramEvent";
import {
  insertOrUpdateTelegramNullifier,
  insertTelegramTopic
} from "../database/queries/telegram/insertTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import {
  BotContext,
  SessionData,
  adminGroupChatCommands,
  base64EncodeTopicData,
  chatsToPostIn,
  findChatByEventIds,
  getGroupChat,
  getSessionKey,
  helpResponse,
  isDirectMessage,
  isGroupWithTopics,
  privateChatCommands,
  ratResponse,
  senderIsAdmin,
  startBot,
  verifyZKEdDSAEventTicketPCD
} from "../util/telegramHelpers";
import { checkSlidingWindowRateLimit } from "../util/util";
import { RollbarService } from "./rollbarService";
import { traced } from "./telemetryService";

export class AnonBotService {
  private context: ApplicationContext;
  private anonBot: Bot<BotContext>;
  private rollbarService: RollbarService | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    anonBot: Bot<BotContext>
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.anonBot = anonBot;

    this.setBotInfo();

    const anonSendMenu = new Menu<BotContext>("anonsend");

    anonSendMenu.dynamic(chatsToPostIn);

    this.anonBot.use(anonSendMenu);

    this.anonBot.command("anonsend", async (ctx) => {
      return traced("telegram", "anonsend", async (span) => {
        if (ctx.from?.id) span?.setAttribute("userId", ctx.from.id.toString());
        if (isDirectMessage(ctx)) {
          await ctx.reply("Choose a chat to post in anonymously ⬇", {
            reply_markup: anonSendMenu
          });
        } else {
          await ctx.reply("Please message directly within a private chat.", {
            message_thread_id: ctx.message?.message_thread_id
          });
        }
      });
    });

    this.anonBot.command("incognito", async (ctx) => {
      const messageThreadId = ctx.message?.message_thread_id;

      if (!isGroupWithTopics(ctx.chat)) {
        await ctx.reply(
          "This command only works in a group with Topics enabled.",
          { message_thread_id: messageThreadId }
        );
        return;
      }

      if (!messageThreadId) {
        await ctx.reply("This command only works in a topic", {
          message_thread_id: messageThreadId
        });
        logger("[TELEGRAM] message thread id not found");
        return;
      }

      if (!(await senderIsAdmin(ctx)))
        return ctx.reply(`Only admins can run this command`, {
          message_thread_id: messageThreadId
        });

      try {
        const telegramEvents = await fetchTelegramEventsByChatId(
          this.context.dbPool,
          ctx.chat.id
        );

        const hasLinked = telegramEvents.length > 0;
        if (!hasLinked) {
          await ctx.reply(
            "This group is not linked to an event. If you're an admin, use /manage to link this group to an event.",
            { message_thread_id: messageThreadId }
          );
          return;
        }

        const topicToUpdate = await fetchTelegramTopic(
          this.context.dbPool,
          ctx.chat.id,
          messageThreadId
        );

        if (!topicToUpdate)
          throw new Error(`Couldn't find this topic in the db.`);

        if (topicToUpdate.is_anon_topic) {
          await ctx.reply(`This topic is already anonymous.`, {
            message_thread_id: messageThreadId
          });
          return;
        }

        const topicName =
          topicToUpdate?.topic_name ||
          ctx.message?.reply_to_message?.forum_topic_created?.name;
        if (!topicName) throw new Error(`No topic name found`);

        await insertTelegramTopic(
          this.context.dbPool,
          ctx.chat.id,
          topicName,
          messageThreadId,
          true
        );

        await ctx.reply(
          `Linked with topic name <b>${topicName}</b>.\nIf this name is incorrect, edit this topic name to update`,
          {
            message_thread_id: messageThreadId,
            parse_mode: "HTML"
          }
        );

        const directLinkParams = `${ctx.chat.id.toString()}_${messageThreadId}`;
        const messageToPin = await ctx.reply("Click to post", {
          message_thread_id: messageThreadId,
          reply_markup: new InlineKeyboard().url(
            "Post Anonymously",
            // NOTE: The order and casing of the direct link params is VERY IMPORTANT. https://github.com/TelegramMessenger/Telegram-iOS/issues/1091
            `${process.env.TELEGRAM_ANON_BOT_DIRECT_LINK}?startApp=${directLinkParams}&startapp=${directLinkParams}`
          )
        });
        ctx.pinChatMessage(messageToPin.message_id);
        ctx.api.closeForumTopic(ctx.chat.id, messageThreadId);
      } catch (error) {
        logger(`[ERROR] ${error}`);
        await ctx.reply(`Failed to link anonymous chat. Check server logs`, {
          message_thread_id: messageThreadId
        });
      }
    });

    // Edge case logic to handle routing people between bots

    this.anonBot.command("start", async (ctx) => {
      if (isDirectMessage(ctx)) {
        await ctx.reply("Choose a chat to post in anonymously ⬇", {
          reply_markup: anonSendMenu
        });
      }
    });

    this.anonBot.command("help", helpResponse);
    this.anonBot.on("message", ratResponse);
  }

  private setBotInfo = async (): Promise<void> => {
    // Set Zupass as the default menu item
    if (process.env.PASSPORT_CLIENT_URL) {
      this.anonBot.api.setChatMenuButton({
        menu_button: {
          web_app: { url: process.env.PASSPORT_CLIENT_URL + "/#telegram" },
          type: "web_app",
          text: "Zupass"
        }
      });
    }

    this.anonBot.api.setChatMenuButton({
      menu_button: {
        web_app: { url: process.env.PASSPORT_CLIENT_URL + "/#telegram" },
        type: "web_app",
        text: "Zupass"
      }
    });

    this.anonBot.api.setMyDescription(
      "I'm ZuRat! I send anonmyous messages with zero-knowledge proofs"
    );

    this.anonBot.api.setMyShortDescription(
      "ZuRat sends anonmyous messages with zero-knowledge proofs"
    );

    this.anonBot.api.setMyCommands(
      privateChatCommands.filter((c) => c.isAnon || c.alwaysInclude),
      { scope: { type: "all_private_chats" } }
    );

    this.anonBot.api.setMyCommands(
      adminGroupChatCommands.filter((c) => c.isAnon || c.alwaysInclude),
      {
        scope: { type: "all_chat_administrators" }
      }
    );
  };

  private async sendToAnonymousChannel(
    chatId: number,
    topicId: number,
    message: string
  ): Promise<void> {
    return traced("telegram", "sendToAnonymousChannel", async (span) => {
      span?.setAttribute("chatId", chatId);
      span?.setAttribute("topicId", topicId);
      span?.setAttribute("message", message);

      try {
        await this.anonBot.api.sendMessage(chatId, message, {
          message_thread_id: topicId
        });
      } catch (error: { error_code: number; description: string } & any) {
        const isDeletedThread =
          error.error_code === 400 &&
          error.description === "Bad Request: message thread not found";
        if (isDeletedThread) {
          logger(
            `[TELEGRAM] topic has been deleted from Telegram, removing from db...`
          );
          await deleteTelegramChatTopic(this.context.dbPool, chatId, topicId);
          throw new Error(`Topic has been deleted. Choose a different one!`);
        } else {
          throw new Error(error);
        }
      }
    });
  }

  public async handleSendAnonymousMessage(
    serializedZKEdDSATicket: string,
    message: string,
    topicId: string
  ): Promise<void> {
    return traced("telegram", "handleSendAnonymousMessage", async (span) => {
      span?.setAttribute("topicId", topicId);
      span?.setAttribute("message", message);

      logger("[TELEGRAM] Verifying anonymous message");

      const pcd = await verifyZKEdDSAEventTicketPCD(serializedZKEdDSATicket);

      if (!pcd) {
        throw new Error("Could not verify PCD for anonymous message");
      }

      const { watermark, validEventIds, externalNullifier, nullifierHash } =
        pcd.claim;

      if (!validEventIds) {
        throw new Error(`User did not submit any valid event ids`);
      }

      const eventsByChat = await fetchEventsPerChat(this.context.dbPool);
      const telegramChatId = findChatByEventIds(eventsByChat, validEventIds);
      if (!telegramChatId) {
        throw new Error(
          `User attempted to use a ticket for events ${validEventIds.join(
            ","
          )}, which have no matching chat`
        );
      }
      span?.setAttribute("chatId", telegramChatId);

      if (!watermark) {
        throw new Error("Anonymous message PCD did not contain watermark");
      }

      function getMessageWatermark(message: string): bigint {
        const hashed = sha256(message).substring(0, 16);
        return BigInt("0x" + hashed);
      }

      if (getMessageWatermark(message).toString() !== watermark.toString()) {
        throw new Error(
          `Anonymous message string ${message} didn't match watermark. got ${watermark} and expected ${getMessageWatermark(
            message
          ).toString()}`
        );
      }

      logger(
        `[TELEGRAM] Verified PCD for anonynmous message with events ${validEventIds}`
      );

      const topic = await fetchTelegramTopic(
        this.context.dbPool,
        parseInt(telegramChatId),
        parseInt(topicId)
      );

      if (!topic || !topic.is_anon_topic || !topic.topic_id) {
        throw new Error(`this group doesn't have any anon topics`);
      }

      // The event is linked to a chat. Make sure we can access it.
      const chat = await getGroupChat(this.anonBot.api, telegramChatId);
      span?.setAttribute("chatTitle", chat.title);

      if (!nullifierHash) throw new Error(`Nullifier hash not found`);

      const expectedExternalNullifier = getAnonTopicNullifier(
        chat.id,
        parseInt(topicId)
      ).toString();

      if (externalNullifier !== expectedExternalNullifier)
        throw new Error("Nullifier mismatch - try proving again.");

      const nullifierData = await fetchAnonTopicNullifier(
        this.context.dbPool,
        nullifierHash
      );

      if (!nullifierData) {
        await insertOrUpdateTelegramNullifier(
          this.context.dbPool,
          nullifierHash,
          [new Date().toISOString()]
        );
      } else {
        const timestamps = nullifierData.message_timestamps.map((t) =>
          new Date(t).getTime()
        );
        const maxDailyPostsPerTopic = parseInt(
          process.env.MAX_DAILY_ANON_TOPIC_POSTS_PER_USER ?? "3"
        );
        const rlDuration = ONE_HOUR_MS * 24;
        const { rateLimitExceeded, newTimestamps } =
          checkSlidingWindowRateLimit(
            timestamps,
            maxDailyPostsPerTopic,
            rlDuration
          );
        span?.setAttribute("rateLimitExceeded", rateLimitExceeded);

        if (!rateLimitExceeded) {
          await insertOrUpdateTelegramNullifier(
            this.context.dbPool,
            nullifierHash,
            newTimestamps
          );
        } else {
          const rlError = new Error(
            `You have exceeded the daily limit of ${maxDailyPostsPerTopic} messages for this topic.`
          );
          rlError.name = "Rate limit exceeded";
          throw rlError;
        }
      }

      await this.sendToAnonymousChannel(
        chat.id,
        parseInt(topic.topic_id),
        message
      );
    });
  }

  public async handleRequestAnonymousMessageLink(
    telegramChatId: number,
    topicId: number
  ): Promise<string> {
    return traced(
      "telegram",
      "handleRequestAnonymousMessageLink",
      async (span) => {
        // Confirm that topicId exists and is anonymous
        const topic = await fetchTelegramTopic(
          this.context.dbPool,
          telegramChatId,
          topicId
        );

        if (!topic || !topic.is_anon_topic || !topic.topic_id)
          throw new Error(`No anonymous topic found`);

        // Get valid eventIds for this chat
        const telegramEvents = await fetchTelegramEventsByChatId(
          this.context.dbPool,
          telegramChatId
        );
        if (telegramEvents.length === 0)
          throw new Error(`No events associated with this group`);

        const validEventIds = telegramEvents.map((e) => e.ticket_event_id);

        const encodedTopicData = base64EncodeTopicData(
          telegramChatId,
          topic.topic_name,
          topic.topic_id,
          validEventIds
        );

        const url = `${process.env.TELEGRAM_ANON_WEBSITE}?tgWebAppStartParam=${encodedTopicData}`;
        span?.setAttribute(`redriect url`, url);
        logger(
          `[TELEGRAM] generated redirect url to ${process.env.TELEGRAM_ANON_WEBSITE}`
        );

        return url;
      }
    );
  }

  public stop(): void {
    this.anonBot.stop();
  }
}

export async function startAnonBotService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<AnonBotService | null> {
  const botToken = process.env.TELEGRAM_ANON_BOT_TOKEN;

  if (!botToken) {
    logger(
      `[INIT] missing TELEGRAM_ANON_BOT_TOKEN, not instantiating Telegram service`
    );
    return null;
  }

  // Initialize bots
  const anonBot = new Bot<BotContext>(botToken);
  await anonBot.init();

  // Start sessions
  const initial = (): SessionData => ({
    dbPool: context.dbPool
  });

  anonBot.use(session({ initial, getSessionKey }));
  anonBot.catch((error) => logger(`[TELEGRAM] Anon Bot error`, error));

  const service = new AnonBotService(context, rollbarService, anonBot);

  startBot(anonBot, rollbarService);
  anonBot.api.config.use(
    autoRetry({
      maxRetryAttempts: 3, // only repeat requests once
      maxDelaySeconds: 5 // fail immediately if we have to wait >5 seconds
    })
  );

  return service;
}
