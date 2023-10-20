import { autoRetry } from "@grammyjs/auto-retry";
import { Menu } from "@grammyjs/menu";
import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { getAnonTopicNullifier } from "@pcd/passport-interface";
import { ONE_HOUR_MS, sleep } from "@pcd/util";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { Api, Bot, InlineKeyboard, RawApi, session } from "grammy";
import { Chat } from "grammy/types";
import { sha256 } from "js-sha256";
import { deleteTelegramChatTopic } from "../database/queries/telegram/deleteTelegramEvent";
import { deleteTelegramVerification } from "../database/queries/telegram/deleteTelegramVerification";
import {
  fetchAnonTopicNullifier,
  fetchTelegramVerificationStatus
} from "../database/queries/telegram/fetchTelegramConversation";
import {
  fetchEventsPerChat,
  fetchEventsWithTelegramChats,
  fetchTelegramEventsByChatId,
  fetchTelegramTopic,
  fetchTelegramTopicsByChatId
} from "../database/queries/telegram/fetchTelegramEvent";
import {
  insertOrUpdateTelegramNullifier,
  insertTelegramTopic,
  insertTelegramVerification
} from "../database/queries/telegram/insertTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import {
  BotContext,
  SessionData,
  TopicChat,
  base64EncodeTopicData,
  chatIDsToChats,
  chatsToJoin,
  chatsToPostIn,
  eventsToLink,
  findChatByEventIds,
  getBotURL,
  getGroupChat,
  getSessionKey,
  helpResponse,
  isDirectMessage,
  isGroupWithTopics,
  ratResponse,
  senderIsAdmin,
  setBotInfo,
  uwuResponse
} from "../util/telegramHelpers";
import { checkSlidingWindowRateLimit } from "../util/util";
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

export class TelegramService {
  private context: ApplicationContext;
  private authBot: Bot<BotContext>;
  private anonBot: Bot<BotContext>;
  private rollbarService: RollbarService | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    authBot: Bot<BotContext>,
    anonBot: Bot<BotContext>
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.authBot = authBot;
    this.anonBot = anonBot;
    setBotInfo(authBot, anonBot, this.anonBotExists());

    const zupassMenu = new Menu<BotContext>("zupass");
    const eventsMenu = new Menu<BotContext>("events");
    const anonSendMenu = new Menu<BotContext>("anonsend");

    // Uses the dynamic range feature of Grammy menus https://grammy.dev/plugins/menu#dynamic-ranges
    // /link and /unlink are unstable right now, pending fixes
    eventsMenu.dynamic(eventsToLink);
    zupassMenu.dynamic(chatsToJoin);
    anonSendMenu.dynamic(chatsToPostIn);

    this.authBot.use(eventsMenu);
    this.authBot.use(zupassMenu);
    this.anonBot.use(anonSendMenu);

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

    this.authBot.on(":forum_topic_created", async (ctx) => {
      return traced("telegram", "forum_topic_created", async (span) => {
        const topicName = ctx.update?.message?.forum_topic_created.name;
        const messageThreadId = ctx.update.message?.message_thread_id;
        const chatId = ctx.chat.id;
        span?.setAttributes({ topicName, messageThreadId, chatId });

        if (!chatId || !topicName || !messageThreadId)
          throw new Error(`Missing chatId or topic name`);

        await insertTelegramTopic(
          this.context.dbPool,
          chatId,
          messageThreadId,
          topicName,
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

        if (!messageThreadId)
          return logger(
            `[TELEGRAM] ignoring edit for general topic ${topicName}`
          );

        if (!chatId || !topicName)
          throw new Error(`Missing chatId or topic name`);

        const topicsForChat = await fetchTelegramTopicsByChatId(
          this.context.dbPool,
          chatId
        );

        const topic = topicsForChat.find(
          (e) => e.topic_id?.toString() === messageThreadId?.toString()
        );

        if (!topic) {
          logger(`[TELEGRAM] editing topic and adding to db`);
          await insertTelegramTopic(
            this.context.dbPool,
            chatId,
            messageThreadId,
            topicName,
            false
          );
        } else {
          logger(`[TELEGRAM] editing topic and updating db`);
          await insertTelegramTopic(
            this.context.dbPool,
            chatId,
            messageThreadId,
            topicName,
            topic.is_anon_topic
          );
        }
        logger(`[TELEGRAM] Updated topic ${topicName} in the db`);
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
          messageThreadId,
          topicName,
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
    if (this.anonBotExists()) {
      this.authBot.command("anonsend", async (ctx) => {
        if (isDirectMessage(ctx)) {
          await ctx.reply(
            `Please message ZuRat to send anonymous messages 😎: ${ctx.session.anonBotURL}?start=anonsend`
          );
        }
      });

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

    this.authBot.command("help", helpResponse);
    this.authBot.on("message", uwuResponse);
  }

  public anonBotExists(): boolean {
    return this.authBot.botInfo.id !== this.anonBot.botInfo.id;
  }
  /**
   * Telegram does not allow two instances of a authBot to be running at once.
   * During deployment, a new instance of the app will be started before the
   * old one is shut down, so we might end up with two instances running at
   * the same time. This method allows us to delay starting the authBot by an
   * amount configurable per-environment.
   *
   * Since this function awaits on authBot.start(), it will likely be very long-
   * lived.
   */
  public async startBot(bot: Bot<BotContext, Api<RawApi>>): Promise<void> {
    const startDelay = parseInt(process.env.TELEGRAM_BOT_START_DELAY_MS ?? "0");
    if (startDelay > 0) {
      logger(
        `[TELEGRAM] Delaying authBot startup by ${startDelay} milliseconds`
      );
      await sleep(startDelay);
    }

    logger(`[TELEGRAM] Starting authBot`);

    try {
      // This will not resolve while the authBot remains running.
      await bot.start({
        allowed_updates: [
          "chat_join_request",
          "chat_member",
          "message",
          "callback_query"
        ],
        onStart: (info) => {
          logger(`[TELEGRAM] Started bot '${info.username}' successfully!`);
        }
      });
    } catch (e) {
      logger(`[TELEGRAM] Error starting authBot`, e);
      this.rollbarService?.reportError(e);
    }
  }

  private async verifyZKEdDSAEventTicketPCD(
    serializedZKEdDSATicket: string
  ): Promise<ZKEdDSAEventTicketPCD | null> {
    return traced("telegram", "verifyZKEdDSAEventTicketPCD", async (span) => {
      let pcd: ZKEdDSAEventTicketPCD;

      try {
        pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
          JSON.parse(serializedZKEdDSATicket).pcd
        );
      } catch (e) {
        throw new Error(`Deserialization error, ${e}`);
      }

      let signerMatch = false;

      if (!process.env.SERVER_EDDSA_PRIVATE_KEY)
        throw new Error(`Missing server eddsa private key .env value`);

      // This Pubkey value should work for staging + prod as well, but needs to be tested
      const TICKETING_PUBKEY = await getEdDSAPublicKey(
        process.env.SERVER_EDDSA_PRIVATE_KEY
      );

      signerMatch =
        pcd.claim.signer[0] === TICKETING_PUBKEY[0] &&
        pcd.claim.signer[1] === TICKETING_PUBKEY[1];

      span?.setAttribute("signerMatch", signerMatch);
      if (
        // TODO: wrap in a MultiProcessService?
        (await ZKEdDSAEventTicketPCDPackage.verify(pcd)) &&
        signerMatch
      ) {
        return pcd;
      } else {
        logger("[TELEGRAM] pcd invalid");
        return null;
      }
    });
  }

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
      const pcd = await this.verifyZKEdDSAEventTicketPCD(
        serializedZKEdDSATicket
      );

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

  public async handleSendAnonymousMessage(
    serializedZKEdDSATicket: string,
    message: string,
    topicId: string
  ): Promise<void> {
    return traced("telegram", "handleSendAnonymousMessage", async (span) => {
      span?.setAttribute("topicId", topicId);
      span?.setAttribute("message", message);

      logger("[TELEGRAM] Verifying anonymous message");

      const pcd = await this.verifyZKEdDSAEventTicketPCD(
        serializedZKEdDSATicket
      );

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

      if (!topic || !topic.is_anon_topic) {
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

        if (!topic || !topic.is_anon_topic)
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
    this.authBot.stop();
  }
}

export async function startTelegramService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<TelegramService | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const anonBotToken = process.env.TELEGRAM_ANON_BOT_TOKEN;
  const anonBotExists = !!(anonBotToken && anonBotToken !== botToken);

  if (!botToken) {
    logger(
      `[INIT] missing TELEGRAM_BOT_TOKEN, not instantiating Telegram service`
    );
    return null;
  }

  // Initialize bots
  const authBot = new Bot<BotContext>(botToken);
  await authBot.init();
  const authBotURL = await getBotURL(authBot);
  let anonBot: Bot<BotContext>;
  let anonBotURL: string;

  if (anonBotExists) {
    anonBot = new Bot<BotContext>(anonBotToken);
    await anonBot.init();
    anonBotURL = await getBotURL(anonBot);
  } else {
    anonBot = authBot;
    anonBotURL = authBotURL;
  }

  // Start sessions
  const initial = (): SessionData => ({
    dbPool: context.dbPool,
    anonBotExists,
    authBotURL,
    anonBotURL
  });

  if (anonBotExists) {
    anonBot.use(session({ initial, getSessionKey }));
    anonBot.catch((error) => logger(`[TELEGRAM] Bot error`, error));
  }
  authBot.use(session({ initial, getSessionKey }));
  authBot.catch((error) => logger(`[TELEGRAM] Bot error`, error));

  const service = new TelegramService(
    context,
    rollbarService,
    authBot,
    anonBot
  );

  service.startBot(authBot);
  authBot.api.config.use(
    autoRetry({
      maxRetryAttempts: 3, // only repeat requests once
      maxDelaySeconds: 5 // fail immediately if we have to wait >5 seconds
    })
  );

  if (anonBotExists) {
    service.startBot(anonBot);
    anonBot.api.config.use(
      autoRetry({
        maxRetryAttempts: 3, // only repeat requests once
        maxDelaySeconds: 5 // fail immediately if we have to wait >5 seconds
      })
    );
  }

  return service;
}
