import { autoRetry } from "@grammyjs/auto-retry";
import { Menu } from "@grammyjs/menu";
import { Bot, InlineKeyboard, session } from "grammy";
import { Chat } from "grammy/types";
import { deleteTelegramVerification } from "../database/queries/telegram/deleteTelegramVerification";
import { fetchTelegramVerificationStatus } from "../database/queries/telegram/fetchTelegramConversation";
import {
  fetchEventsPerChat,
  fetchEventsWithTelegramChats,
  fetchTelegramTopic
} from "../database/queries/telegram/fetchTelegramEvent";
import {
  insertTelegramChat,
  insertTelegramTopic,
  insertTelegramVerification
} from "../database/queries/telegram/insertTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import {
  AuthBotContext,
  AuthSessionData,
  BotContext,
  TopicChat,
  adminGroupChatCommands,
  chatIDsToChats,
  chatsToJoin,
  eventsToLink,
  findChatByEventIds,
  getGroupChat,
  getSessionKey,
  helpResponse,
  isDirectMessage,
  isGroupWithTopics,
  privateChatCommands,
  senderIsAdmin,
  startBot,
  uwuResponse,
  verifyZKEdDSAEventTicketPCD
} from "../util/telegramHelpers";
import { RollbarService } from "./rollbarService";
import { traced } from "./telemetryService";

const ALLOWED_TICKET_MANAGERS = [
  "cha0sg0d",
  "notdavidhuang",
  "richardyliu",
  "gubsheep",
  "chubivan"
];

const adminBotChannel = "Admins";

export class AuthBotService {
  private context: ApplicationContext;
  private authBot: Bot<AuthBotContext>;
  private rollbarService: RollbarService | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    authBot: Bot<AuthBotContext>
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.authBot = authBot;

    this.setBotInfo();

    const zupassMenu = new Menu<AuthBotContext>("zupass");
    const eventsMenu = new Menu<AuthBotContext>("events");

    // Uses the dynamic range feature of Grammy menus https://grammy.dev/plugins/menu#dynamic-ranges
    // /link and /unlink are unstable right now, pending fixes
    eventsMenu.dynamic(eventsToLink);
    zupassMenu.dynamic(chatsToJoin);

    this.authBot.use(eventsMenu);
    this.authBot.use(zupassMenu);

    // Users gain access to gated chats by requesting to join. The authBot
    // receives a notification of this, and will approve requests from
    // users who have verified their possession of a matching PCD.
    // Approval of the join request is required even for users with the
    // invite link - see `creates_join_request` parameter on
    // `createChatInviteLink` API invocation below.

    this.authBot.on("chat_join_request", async (ctx) => {
      return traced("telegram", "chat_join_request", async (span) => {
        const userId = ctx.chatJoinRequest.user_chat_id;
        if (userId) span?.setAttribute("userId", userId.toString());

        try {
          const chatId = ctx.chatJoinRequest.chat.id;
          if (chatId) span?.setAttribute("chatId", chatId);

          logger(
            `[TELEGRAM] Got chat join request for ${chatId} from ${userId}`
          );
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
            const chat = await getGroupChat(ctx.api, chatId);

            await this.authBot.api.approveChatJoinRequest(chatId, userId);
            if (ctx.chatJoinRequest?.invite_link?.invite_link) {
              await this.authBot.api.sendMessage(
                userId,
                `You have been approved! Join here ⬇`,
                {
                  reply_markup: new InlineKeyboard().url(
                    `Join ${chat?.title}`,
                    ctx.chatJoinRequest.invite_link.invite_link
                  ),
                  parse_mode: "HTML"
                }
              );

              await this.authBot.api.sendMessage(userId, `🚀`, {
                parse_mode: "HTML"
              });
            } else {
              await this.authBot.api.sendMessage(
                userId,
                `Congrats! ${chat?.title} should now appear at the top of your list
               of Chats.\nYou can also click the above button.`
              );
            }
          } else {
            await this.authBot.api.sendMessage(
              userId,
              `You are not verified. Try again with the /start command.`
            );
          }
        } catch (e) {
          await this.authBot.api.sendMessage(userId, `Error joining: ${e}`);
          logger("[TELEGRAM] chat_join_request error", e);
          this.rollbarService?.reportError(e);
        }
      });
    });

    // When a user joins the channel, remove their verification, so they
    // cannot rejoin without verifying again.
    this.authBot.on("chat_member", async (ctx) => {
      return traced("telegram", "chat_member", async (span) => {
        try {
          const newMember = ctx.update.chat_member.new_chat_member;
          span?.setAttribute("userId", newMember.user.id.toString());
          span?.setAttribute("status", newMember.status);

          if (newMember.status === "left" || newMember.status === "kicked") {
            logger(
              `[TELEGRAM] Deleting verification for user leaving ${
                newMember.user.username || newMember.user.first_name
              } in chat ${ctx.chat.id}`
            );
            await deleteTelegramVerification(
              this.context.dbPool,
              newMember.user.id,
              ctx.chat.id
            );
            const chat = await getGroupChat(ctx.api, ctx.chat.id);
            span?.setAttribute("chatId", chat.id);
            span?.setAttribute("chatTitle", chat.title);

            const userId = newMember.user.id;
            if (!newMember.user.is_bot) {
              await this.authBot.api.sendMessage(
                userId,
                `<i>You left ${chat?.title}. To join again, you must re-verify by typing /start.</i>`,
                { parse_mode: "HTML" }
              );
            }
          }
        } catch (e) {
          logger("[TELEGRAM] chat_member error", e);
          this.rollbarService?.reportError(e);
        }
      });
    });

    // The "start" command initiates the process of invitation and approval.
    this.authBot.command("start", async (ctx) => {
      return traced("telegram", "start", async (span) => {
        const userId = ctx?.from?.id;
        if (userId) span?.setAttribute("userId", userId?.toString());
        try {
          // Only process the command if it comes as a private message.
          if (isDirectMessage(ctx) && userId) {
            const username = ctx?.from?.username;
            if (username) span?.setAttribute("username", username);
            const firstName = ctx?.from?.first_name;
            const name = firstName || username;
            await ctx.reply(
              `Welcome ${name}! 👋\n\nClick the group you want to join.\n\nYou will sign in to Zupass, then ZK prove you have a ticket for one of the group's events.\n\nSee you soon 😽`,
              { reply_markup: zupassMenu }
            );
          }
        } catch (e) {
          logger("[TELEGRAM] start error", e);
          this.rollbarService?.reportError(e);
        }
      });
    });

    // The "link <eventName>" command is a dev utility for associating the channel Id with a given event.
    this.authBot.command("manage", async (ctx) => {
      const messageThreadId = ctx?.message?.message_thread_id;

      try {
        const admins = await ctx.getChatAdministrators();
        const username = ctx?.from?.username;
        if (!username) throw new Error(`Username not found`);

        if (!(await senderIsAdmin(ctx, admins)))
          return ctx.reply(`Only admins can run this command`);

        if (!ALLOWED_TICKET_MANAGERS.includes(username))
          return ctx.reply(
            `Only Zupass team members are allowed to run this command.`
          );

        if (!isGroupWithTopics(ctx.chat)) {
          await ctx.reply(
            "This command only works in a group with Topics enabled.",
            { message_thread_id: messageThreadId }
          );
        }

        if (messageThreadId)
          return ctx.reply(`Must be in ${adminBotChannel}.`, {
            message_thread_id: messageThreadId
          });

        const botIsAdmin = admins.some(
          (admin) => admin.user.id === this.authBot.botInfo.id
        );
        if (!botIsAdmin) {
          await ctx.reply(
            "Please add me as an admin to the telegram channel associated with your event.",
            { message_thread_id: messageThreadId }
          );
          return;
        }

        ctx.reply(
          `Choose an event to manage.\n\n <i>✅ = this chat is gated by event.</i>`,
          {
            reply_markup: eventsMenu,
            parse_mode: "HTML",
            message_thread_id: messageThreadId
          }
        );
      } catch (error) {
        await ctx.reply(`${error}`, { message_thread_id: messageThreadId });
        logger(`[TELEGRAM] ERROR`, error);
      }
    });

    this.authBot.command("setup", async (ctx) => {
      const messageThreadId = ctx?.message?.message_thread_id;
      try {
        if (!isGroupWithTopics(ctx.chat)) {
          throw new Error("Please enable topics for this group and try again");
        }

        if (ctx?.message?.is_topic_message)
          throw new Error(`Cannot run setup from an existing topic`);

        await ctx.editGeneralForumTopic(adminBotChannel);
        await ctx.closeGeneralForumTopic();
        const topic = await ctx.createForumTopic(`Announcements`, {
          icon_custom_emoji_id: "5309984423003823246" // 📢
        });
        await ctx.api.closeForumTopic(ctx.chat.id, topic.message_thread_id);
      } catch (error) {
        await ctx.reply(`❌ ${error}`, {
          reply_to_message_id: messageThreadId
        });
      }
    });

    this.authBot.command("adminhelp", async (ctx) => {
      const messageThreadId = ctx?.message?.message_thread_id;
      const admins = await ctx.getChatAdministrators();

      if (!(await senderIsAdmin(ctx, admins)))
        return ctx.reply(`Only admins can run this command`, {
          message_thread_id: messageThreadId
        });

      if (messageThreadId)
        return ctx.reply(`Must be in ${adminBotChannel}.`, {
          message_thread_id: messageThreadId
        });

      const userId = ctx.from?.id;
      if (!userId)
        return ctx.reply(`User not found, try again.`, {
          message_thread_id: messageThreadId
        });

      const chat = (await ctx.api.getChat(ctx.chat.id)) as TopicChat;
      await ctx.api.sendMessage(
        userId,
        `Sending info for group <b>${chat?.title}</b> ID: <i>${ctx.chat.id}</i>`,
        { parse_mode: "HTML" }
      );

      const msg = await ctx.api.sendMessage(
        userId,
        `Loading tickets and events...`
      );
      const events = await fetchEventsWithTelegramChats(this.context.dbPool);
      const eventsWithChats = await chatIDsToChats(ctx, events);

      if (eventsWithChats.length === 0) {
        return ctx.api.editMessageText(
          userId,
          msg.message_id,
          `No chats found to join. If you are an admin of a group, you can add me and type /manage to link an event.`,
          {
            parse_mode: "HTML"
          }
        );
      }

      let eventsHtml = `<b> Current Chats with Events </b>\n\n`;

      for (const event of eventsWithChats) {
        if (event.chat?.title)
          eventsHtml += `Chat: <b>${event.chat.title}</b> ➡ Event: <i>${event.eventName}</i> \n`;
      }

      await ctx.api.editMessageText(userId, msg.message_id, eventsHtml, {
        parse_mode: "HTML"
      });
    });

    this.authBot.on(":forum_topic_created", async (ctx) => {
      return traced("telegram", "forum_topic_created", async (span) => {
        const topicName = ctx.update?.message?.forum_topic_created.name;
        const messageThreadId = ctx.update.message?.message_thread_id;
        const chatId = ctx.chat.id;
        span?.setAttributes({ topicName, messageThreadId, chatId });

        if (!chatId || !topicName)
          throw new Error(`Missing chatId or topic name`);

        await insertTelegramChat(this.context.dbPool, chatId);
        await insertTelegramTopic(
          this.context.dbPool,
          chatId,
          topicName,
          messageThreadId,
          false
        );

        logger(`[TELEGRAM CREATED]`, topicName, messageThreadId, chatId);
      });
    });

    this.authBot.on(":forum_topic_edited", async (ctx) => {
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

    this.authBot.command("help", helpResponse);
    this.authBot.on("message", uwuResponse);
  }

  private setBotInfo(): void {
    if (process.env.PASSPORT_CLIENT_URL) {
      this.authBot.api.setChatMenuButton({
        menu_button: {
          web_app: { url: process.env.PASSPORT_CLIENT_URL + "/#telegram" },
          type: "web_app",
          text: "Zupass"
        }
      });

      this.authBot.api.setMyDescription(
        "I'm ZuKat! I manage fun events with zero-knowledge proofs. Press START to begin 😽"
      );

      this.authBot.api.setMyShortDescription(
        "ZuKat manages events and groups with zero-knowledge proofs"
      );

      this.authBot.api.setMyCommands(adminGroupChatCommands, {
        scope: { type: "all_chat_administrators" }
      });

      this.authBot.api.setMyCommands(privateChatCommands, {
        scope: { type: "all_private_chats" }
      });
    }
  }

  private async sendInviteLink(
    userId: number,
    chat: Chat.SupergroupChat
  ): Promise<void> {
    return traced("telegram", "sendInviteLink", async (span) => {
      span?.setAttribute("userId", userId.toString());
      span?.setAttribute("chatId", chat.id);
      span?.setAttribute("chatTitle", chat.title);

      // Send the user an invite link. When they follow the link, this will
      // trigger a "join request", which the authBot will respond to.

      logger(
        `[TELEGRAM] Creating chat invite link to ${chat.title}(${chat.id}) for ${userId}`
      );
      const inviteLink = await this.authBot.api.createChatInviteLink(chat.id, {
        creates_join_request: true,
        name: `${Date.now().toLocaleString()}`
      });
      await this.authBot.api.sendMessage(
        userId,
        `You've proved that you have a ticket for <b>${chat.title}</b>!\n\nNow, request to join the group ⬇`,
        {
          reply_markup: new InlineKeyboard().url(
            `Request to join`,
            inviteLink.invite_link
          ),
          parse_mode: "HTML"
        }
      );
    });
  }

  /**
   * Verify that a PCD relates to an event, and that the event has an
   * associated chat. If so, invite the user to the chat and record them
   * for later approval when they request to join.
   *
   * This is called from the /telegram/verify route.
   */
  public async handleVerification(
    serializedZKEdDSATicket: string,
    telegramUserId: number
  ): Promise<void> {
    return traced("telegram", "handleVerification", async (span) => {
      span?.setAttribute("userId", telegramUserId.toString());
      // Verify PCD
      const pcd = await verifyZKEdDSAEventTicketPCD(serializedZKEdDSATicket);

      if (!pcd) {
        throw new Error(`Could not verify PCD for ${telegramUserId}`);
      }
      span?.setAttribute("verifiedPCD", true);

      const { watermark } = pcd.claim;

      if (!watermark) {
        throw new Error("Verification PCD did not contain watermark");
      }

      if (telegramUserId.toString() !== watermark.toString()) {
        throw new Error(
          `Telegram User id ${telegramUserId} does not match given watermark ${watermark}`
        );
      }

      const { attendeeSemaphoreId } = pcd.claim.partialTicket;

      if (!attendeeSemaphoreId) {
        throw new Error(
          `User ${telegramUserId} did not reveal their semaphore id`
        );
      }
      span?.setAttribute("semaphoreId", attendeeSemaphoreId);

      const { validEventIds } = pcd.claim;
      if (!validEventIds) {
        throw new Error(
          `User ${telegramUserId} did not submit any valid event ids`
        );
      }
      span?.setAttribute("validEventIds", validEventIds);

      const eventsByChat = await fetchEventsPerChat(this.context.dbPool);
      const telegramChatId = findChatByEventIds(eventsByChat, validEventIds);
      if (!telegramChatId) {
        throw new Error(
          `User ${telegramUserId} attempted to use a ticket for events ${validEventIds.join(
            ","
          )}, which have no matching chat`
        );
      }
      span?.setAttribute("chatId", telegramChatId);

      const chat = await getGroupChat(this.authBot.api, telegramChatId);

      span?.setAttribute("chatTitle", chat.title);

      logger(`[TELEGRAM] Verified PCD for ${telegramUserId}, chat ${chat}`);

      // We've verified that the chat exists, now add the user to our list.
      // This will be important later when the user requests to join.
      await insertTelegramVerification(
        this.context.dbPool,
        telegramUserId,
        parseInt(telegramChatId),
        attendeeSemaphoreId
      );

      // Send invite link
      await this.sendInviteLink(telegramUserId, chat);
    });
  }

  public stop(): void {
    this.authBot.stop();
  }
}

export async function startAuthBotService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<AuthBotService | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    logger(
      `[INIT] missing TELEGRAM_BOT_TOKEN, not instantiating Telegram Auth Service`
    );
    return null;
  }

  // Initialize bots
  const authBot = new Bot<BotContext>(botToken);
  await authBot.init();

  // Start sessions
  const initial = (): AuthSessionData => ({
    dbPool: context.dbPool
  });

  authBot.use(session({ initial, getSessionKey }));
  authBot.catch((error) => logger(`[TELEGRAM] Auth Bot error`, error));

  const service = new AuthBotService(context, rollbarService, authBot);

  startBot(authBot, rollbarService);
  authBot.api.config.use(
    autoRetry({
      maxRetryAttempts: 3, // only repeat requests once
      maxDelaySeconds: 5 // fail immediately if we have to wait >5 seconds
    })
  );

  return service;
}
