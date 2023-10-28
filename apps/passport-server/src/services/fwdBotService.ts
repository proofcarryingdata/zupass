import { autoRetry } from "@grammyjs/auto-retry";
import { Menu } from "@grammyjs/menu";
import { Bot, session } from "grammy";
import {
  fetchTelegramTopic,
  fetchTelegramTopicForwarding
} from "../database/queries/telegram/fetchTelegramEvent";
import {
  insertTelegramChat,
  insertTelegramForward,
  insertTelegramTopic
} from "../database/queries/telegram/insertTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import {
  ALLOWED_TICKET_MANAGERS,
  BotContext,
  SessionData,
  chatsToForwardTo,
  getSessionKey,
  isDirectMessage,
  startBot
} from "../util/telegramHelpers";
import { RollbarService } from "./rollbarService";
import { traced } from "./telemetryService";

export class FwdBotService {
  private context: ApplicationContext;
  private forwardBot: Bot<BotContext>;
  private rollbarService: RollbarService | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    forwardBot: Bot<BotContext>
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.forwardBot = forwardBot;

    this.setBotInfo();

    const forwardMenu = new Menu<BotContext>("forward");

    forwardMenu.dynamic(chatsToForwardTo);

    this.forwardBot.use(forwardMenu);

    this.forwardBot.command("receive", async (ctx) => {
      const messageThreadId = ctx.message?.message_thread_id;
      try {
        logger(`[TELEGRAM] running receive`);
        if (isDirectMessage(ctx))
          return ctx.reply(`/receive can only be run in a group chat`);

        if (!ctx.from?.username)
          return ctx.reply(`No username found`, {
            reply_to_message_id: messageThreadId
          });

        if (!ALLOWED_TICKET_MANAGERS.includes(ctx.from.username))
          return ctx.reply(
            `Only Zupass team members are allowed to run this command.`,
            { reply_to_message_id: messageThreadId }
          );

        // Look up topic.
        const topic = await fetchTelegramTopic(
          this.context.dbPool,
          ctx.chat.id,
          messageThreadId
        );
        const chatId = ctx.chat.id;

        // If the topic doesn't exist, add it and the chatId to the DB.
        if (!topic) {
          logger(`[TELEGRAM] topic not found to mark as receiving.`);
          const topicName =
            ctx.message?.reply_to_message?.forum_topic_created?.name;
          if (!topicName)
            return ctx.reply(`No topic name found`, {
              reply_to_message_id: messageThreadId
            });

          await insertTelegramChat(this.context.dbPool, chatId);
          await insertTelegramTopic(
            this.context.dbPool,
            chatId,
            topicName,
            messageThreadId,
            false
          );
          // Fetch the newly created topic
          const newTopic = await fetchTelegramTopic(
            this.context.dbPool,
            ctx.chat.id,
            messageThreadId
          );

          if (!newTopic) throw new Error(`Failed to fetch new topic`);
          // Add it to the forwarding table
          await insertTelegramForward(this.context.dbPool, null, newTopic.id);

          await ctx.reply(
            `Added <b>${topicName}</b> to receive messages. If this name is incorrect, edit the name to update the database.`,
            {
              reply_to_message_id: messageThreadId,
              parse_mode: "HTML"
            }
          );
        } else {
          await insertTelegramForward(this.context.dbPool, null, topic.id);
          logger(`[TELEGRAM] ${topic.topic_name} can receive messages`);
          await ctx.reply(`<b>${topic.topic_name}</b> can receive messages`, {
            reply_to_message_id: messageThreadId,
            parse_mode: "HTML"
          });
        }
      } catch (error) {
        ctx.reply(`Error: ${error}`, {
          reply_to_message_id: messageThreadId
        });
      }
    });

    this.forwardBot.command("forward", async (ctx) => {
      if (isDirectMessage(ctx))
        return ctx.reply(`/forward can only be run in a group chat`);

      const messageThreadId = ctx.message?.message_thread_id;

      if (!ctx.from?.username)
        return ctx.reply(`No username found`, {
          reply_to_message_id: messageThreadId
        });

      if (!ALLOWED_TICKET_MANAGERS.includes(ctx.from.username))
        return ctx.reply(
          `Only Zupass team members are allowed to run this command.`,
          { reply_to_message_id: messageThreadId }
        );

      await ctx.reply(`Choose a group and topic to forward messages to`, {
        reply_markup: forwardMenu,
        message_thread_id: messageThreadId
      });
    });

    this.forwardBot.on("message", async (ctx) => {
      const text = ctx.message.text;

      if (isDirectMessage(ctx)) {
        return await ctx.reply(`I can only forward messages in a group chat`);
      } else {
        const messageThreadId = ctx.message?.message_thread_id;

        try {
          // Check to see if message is from a topic in the forwarding table
          const forwardResults = await fetchTelegramTopicForwarding(
            this.context.dbPool,
            ctx.chat.id,
            messageThreadId
          );

          if (forwardResults?.length > 0) {
            const sentMessages = forwardResults.map((f) => {
              const destinationTopicID = f.receiverTopicID
                ? parseInt(f.receiverTopicID)
                : undefined;
              logger(
                `[TElEGRAM] forwarding message ${text} to ${f.receiverTopicName}`
              );
              return ctx.api.forwardMessage(
                f.receiverChatID,
                f.senderChatID,
                ctx.message.message_id,
                {
                  message_thread_id: destinationTopicID
                }
              );
            });
            await Promise.allSettled(sentMessages);
          }
        } catch (error) {
          ctx.reply(`${error}`, { reply_to_message_id: messageThreadId });
        }
      }
    });

    this.forwardBot.on(":forum_topic_edited", async (ctx) => {
      return traced("telegram", "forum_topic_edited", async (span) => {
        const topicName = ctx.update?.message?.forum_topic_edited.name;
        const chatId = ctx.chat.id;
        const messageThreadId = ctx.update.message?.message_thread_id;
        span?.setAttributes({ topicName, messageThreadId, chatId });

        if (!chatId || !topicName)
          throw new Error(`Missing chatId or topic name`);

        const topic = await fetchTelegramTopic(
          this.context.dbPool,
          chatId,
          messageThreadId
        );

        if (!topic) {
          logger(`[TELEGRAM] adding topic ${topicName} to db`);
          await insertTelegramChat(this.context.dbPool, chatId);
          await insertTelegramTopic(
            this.context.dbPool,
            chatId,
            topicName,
            messageThreadId,
            false
          );
        } else {
          logger(`[TELEGRAM] updating topic ${topicName} in db`);
          await insertTelegramTopic(
            this.context.dbPool,
            topic.telegramChatID,
            topicName,
            topic.topic_id,
            topic.is_anon_topic
          );
        }
      });
    });
  }

  private setBotInfo(): void {
    this.forwardBot.api.setMyDescription(
      `To join the Devconnect Community Hub, send a DM here: https://t.me/zucat_bot?start=auth`
    );
    this.forwardBot.api.setMyShortDescription(
      `To join the Devconnect Community Hub, send a DM here: https://t.me/zucat_bot?start=auth`
    );
  }

  public stop(): void {
    this.forwardBot.stop();
  }
}

export async function startFwdBotService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<FwdBotService | null> {
  const botToken = process.env.TELEGRAM_FORWARD_BOT_TOKEN;

  if (!botToken) {
    logger(
      `[INIT] missing TELEGRAM_BOT_TOKEN, not instantiating Telegram service`
    );
    return null;
  }

  // Initialize bots
  const forwardBot = new Bot<BotContext>(botToken);
  await forwardBot.init();

  // Start sessions
  const initial = (): SessionData => ({
    dbPool: context.dbPool
  });

  forwardBot.use(session({ initial, getSessionKey }));
  forwardBot.catch((error) => logger(`[TELEGRAM] Forward Bot error`, error));

  const service = new FwdBotService(
    context,
    rollbarService,

    forwardBot
  );

  startBot(forwardBot, rollbarService);
  forwardBot.api.config.use(
    autoRetry({
      maxRetryAttempts: 3, // only repeat requests once
      maxDelaySeconds: 5 // fail immediately if we have to wait >5 seconds
    })
  );

  return service;
}
