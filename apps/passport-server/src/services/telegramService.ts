import { autoRetry } from "@grammyjs/auto-retry";
import { Menu } from "@grammyjs/menu";
import {
  EdDSAPublicKey,
  getEdDSAPublicKey,
  isEqualEdDSAPublicKey
} from "@pcd/eddsa-pcd";
import {
  DEVCON_2024_EDDSA_PUBKEY,
  NullifierHashPayload,
  PayloadType,
  ReactDataPayload,
  RedirectTopicDataPayload
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { RollbarService } from "@pcd/server-shared";
import {
  ONE_HOUR_MS,
  bigIntToPseudonymEmoji,
  bigIntToPseudonymName,
  encodeAnonMessageIdAndReaction,
  getAnonTopicNullifier,
  getMessageWatermark,
  isFulfilled,
  sleep
} from "@pcd/util";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage,
  ZKEdDSAEventTicketPCDTypeName
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { ZKEdDSAFrogPCDTypeName } from "@pcd/zk-eddsa-frog-pcd";
import { Api, Bot, InlineKeyboard, RawApi, session } from "grammy";
import {
  Chat,
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  Message,
  UserFromGetMe
} from "grammy/types";
import _ from "lodash";
import { PoolClient } from "postgres-pool";
import { v1 as uuidV1 } from "uuid";
import { AnonMessageWithDetails } from "../database/models";
import {
  deleteTelegramChatTopic,
  deleteTelegramForward
} from "../database/queries/telegram/deleteTelegramEvent";
import { deleteTelegramVerification } from "../database/queries/telegram/deleteTelegramVerification";
import {
  fetchAnonTopicNullifier,
  fetchTelegramVerificationStatus
} from "../database/queries/telegram/fetchTelegramConversation";
import {
  fetchEventsWithTelegramChats,
  fetchTelegramAnonMessagesById,
  fetchTelegramAnonMessagesWithTopicByNullifier,
  fetchTelegramEventsByChatId,
  fetchTelegramTopic,
  fetchTelegramTopicForwarding
} from "../database/queries/telegram/fetchTelegramEvent";
import {
  fetchTelegramReactionsForMessage,
  fetchTelegramTotalKarmaForNullifier
} from "../database/queries/telegram/fetchTelegramReactions";
import {
  insertOrUpdateTelegramNullifier,
  insertTelegramAnonMessage,
  insertTelegramChat,
  insertTelegramForward,
  insertTelegramTopic,
  insertTelegramVerification
} from "../database/queries/telegram/insertTelegramConversation";
import { insertTelegramReaction } from "../database/queries/telegram/insertTelegramReaction";
import { sqlQueryWithPool } from "../database/sqlQuery";
import { ApplicationContext, ServerMode } from "../types";
import { handleFrogVerification } from "../util/frogTelegramHelpers";
import { logger } from "../util/logger";
import {
  BotContext,
  SessionData,
  TopicChat,
  buildReactPayload,
  chatIDsToChats,
  chatsToForwardTo,
  chatsToJoinV2,
  chatsToPostIn,
  encodePayload,
  encodeTopicData,
  eventsToLink,
  generateReactProofUrl,
  getBotURL,
  getChatsWithMembershipStatus,
  getDisplayEmojis,
  getGroupChat,
  getProductIdFromTelegramChat,
  getSessionKey,
  helpResponse,
  isDirectMessage,
  isGroupWithTopics,
  ratResponse,
  senderIsAdmin,
  setBotInfo,
  uwuResponse,
  verifyUserEventIds
} from "../util/telegramHelpers";
import { checkSlidingWindowRateLimit, isValidEmoji } from "../util/util";
import { DiscordService } from "./discordService";
import { setError, traced } from "./telemetryService";

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
  private forwardBot: Bot<BotContext> | undefined;
  private rollbarService: RollbarService | null;
  private discordService: DiscordService | null;
  private readonly MAX_RETRY_ATTEMPTS = 20;
  private readonly RETRY_INTERVAL_SECONDS = 30;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    discordService: DiscordService | null,
    authBot: Bot<BotContext>,
    anonBot: Bot<BotContext>,
    forwardBot?: Bot<BotContext>
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.discordService = discordService;
    this.authBot = authBot;
    this.anonBot = anonBot;
    this.forwardBot = forwardBot;

    setBotInfo(authBot, anonBot, this.anonBotExists(), forwardBot);

    const zupassMenu = new Menu<BotContext>("zupass");
    const eventsMenu = new Menu<BotContext>("events");
    const anonSendMenu = new Menu<BotContext>("anonsend");
    const forwardMenu = new Menu<BotContext>("forward");

    // Uses the dynamic range feature of Grammy menus https://grammy.dev/plugins/menu#dynamic-ranges
    // /link and /unlink are unstable right now, pending fixes
    eventsMenu.dynamic(eventsToLink);
    zupassMenu.dynamic(chatsToJoinV2);
    anonSendMenu.dynamic(chatsToPostIn);
    forwardMenu.dynamic(chatsToForwardTo);

    this.authBot.use(eventsMenu);
    this.authBot.use(zupassMenu);
    this.anonBot.use(anonSendMenu);
    this.forwardBot?.use(forwardMenu);

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
          const isVerified = await sqlQueryWithPool(
            this.context.dbPool,
            (client) => fetchTelegramVerificationStatus(client, userId, chatId)
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
              this.authBot.api.sendMessage(
                userId,
                `To join another group, type /start 😽`,
                {
                  parse_mode: "HTML"
                }
              );
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
          sqlQueryWithPool(this.context.dbPool, async (client) => {
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
                client,
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
          });
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
        ctx.session.chatToJoin = undefined;
        if (userId) span?.setAttribute("userId", userId?.toString());
        try {
          // Only process the command if it comes as a private message.
          if (isDirectMessage(ctx) && userId) {
            const username = ctx?.from?.username;
            if (username) span?.setAttribute("username", username);
            const firstName = ctx?.from?.first_name;
            const name = firstName || username;
            ctx.session.directLinkMode = false;
            if (ctx.match && Number.isInteger(Number(ctx.match))) {
              const [chatWithMembership] = await sqlQueryWithPool(
                ctx.session.dbPool,
                (client) =>
                  getChatsWithMembershipStatus(
                    client,
                    ctx,
                    userId,
                    Number(ctx.match)
                  )
              );
              if (chatWithMembership) {
                ctx.session.chatToJoin = chatWithMembership;
                ctx.session.directLinkMode = true;
                const chatTitle = chatWithMembership.chat?.title;
                if (chatWithMembership.isChatMember) {
                  return await ctx.reply(
                    `Welcome ${name}! 👋\n\nYou are already a member of <b>${chatTitle}</b>. Please click the button below to join!`,
                    { reply_markup: zupassMenu, parse_mode: "HTML" }
                  );
                }
                return await ctx.reply(
                  `Welcome ${name}! 👋\n\nClick the button below to join${
                    chatTitle ? ` <b>${chatTitle}</b>` : ""
                  }.\n\nYou will sign in to Zupass, then ZK prove you have a valid ticket.`,
                  { reply_markup: zupassMenu, parse_mode: "HTML" }
                );
              }
            }
            await ctx.reply(
              `Welcome ${name}! 👋\n\nClick the group you want to join.\n\nYou will sign in to Zupass, then ZK prove you have a ticket for one of the group's events.`,
              { reply_markup: zupassMenu }
            );
          }
        } catch (e) {
          if (userId)
            ctx.api.sendMessage(
              userId,
              `Start command failed.\nPlease join https://t.me/zupass_help for help.`
            );
          logger("[TELEGRAM] start error", JSON.stringify(e));
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
      const events = await sqlQueryWithPool(ctx.session.dbPool, (client) =>
        fetchEventsWithTelegramChats(client, false)
      );
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
        await sqlQueryWithPool(this.context.dbPool, async (client) => {
          const topicName = ctx.update?.message?.forum_topic_created.name;
          const messageThreadId = ctx.update.message?.message_thread_id;
          const chatId = ctx.chat.id;
          span?.setAttributes({ topicName, messageThreadId, chatId });

          if (!chatId || !topicName)
            throw new Error(`Missing chatId or topic name`);

          await insertTelegramChat(client, chatId);
          await insertTelegramTopic(
            client,
            chatId,
            topicName,
            messageThreadId,
            false
          );

          logger(`[TELEGRAM CREATED]`, topicName, messageThreadId, chatId);
        });
      });
    });

    this.authBot.on(":forum_topic_edited", async (ctx) => {
      return traced("telegram", "forum_topic_edited", async (span) => {
        await sqlQueryWithPool(this.context.dbPool, async (client) => {
          const topicName = ctx.update?.message?.forum_topic_edited.name;
          const chatId = ctx.chat.id;
          const messageThreadId = ctx.update.message?.message_thread_id;
          span?.setAttributes({ topicName, messageThreadId, chatId });

          if (!chatId || !topicName)
            throw new Error(`Missing chatId or topic name`);

          const topic = await fetchTelegramTopic(
            client,
            chatId,
            messageThreadId
          );

          if (!topic) {
            logger(`[TELEGRAM] adding topic ${topicName} to db`);
            await insertTelegramChat(client, chatId);
            await insertTelegramTopic(
              client,
              chatId,
              topicName,
              messageThreadId,
              false
            );
          } else {
            logger(`[TELEGRAM] updating topic ${topicName} in db`);
            await insertTelegramTopic(
              client,
              topic.telegramChatID,
              topicName,
              topic.topic_id,
              topic.is_anon_topic
            );
          }
        });
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
        await sqlQueryWithPool(ctx.session.dbPool, async (client) => {
          const telegramEvents = await fetchTelegramEventsByChatId(
            client,
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
            client,
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
            client,
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

          const directLinkParams: RedirectTopicDataPayload = {
            type: PayloadType.RedirectTopicData,
            value: {
              topicId: messageThreadId,
              chatId: ctx.chat.id
            }
          };

          const encodedPayload = Buffer.from(
            JSON.stringify(directLinkParams),
            "utf-8"
          ).toString("base64");

          const messageToPin = await ctx.reply("Click to post", {
            message_thread_id: messageThreadId,
            reply_markup: new InlineKeyboard().url(
              "Post Anonymously",
              // NOTE: The order and casing of the direct link params is VERY IMPORTANT. https://github.com/TelegramMessenger/Telegram-iOS/issues/1091
              `${process.env.TELEGRAM_ANON_BOT_DIRECT_LINK}?startApp=${encodedPayload}&startapp=${encodedPayload}`
            )
          });
          ctx.pinChatMessage(messageToPin.message_id);
          ctx.api.closeForumTopic(ctx.chat.id, messageThreadId);
        });
      } catch (error) {
        logger(`[ERROR] ${error}`);
        await ctx.reply(`Failed to link anonymous chat. ${error} `, {
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

    if (this.forwardBot) {
      this.forwardBot.command("receive", async (ctx) => {
        await sqlQueryWithPool(ctx.session.dbPool, async (client) => {
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
              client,
              ctx.chat.id,
              messageThreadId
            );

            if (!topic)
              throw new Error(
                `No topic found. Edit the topic name and try again!`
              );

            await insertTelegramForward(client, null, topic.id);
            logger(`[TELEGRAM] ${topic.topic_name} can receive messages`);
            await ctx.reply(`<b>${topic.topic_name}</b> can receive messages`, {
              reply_to_message_id: messageThreadId,
              parse_mode: "HTML"
            });
          } catch (error) {
            ctx.reply(`${error}`, {
              reply_to_message_id: messageThreadId
            });
          }
        });
      });

      this.forwardBot.command("stopreceive", async (ctx) => {
        await sqlQueryWithPool(ctx.session.dbPool, async (client) => {
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
              client,
              ctx.chat.id,
              messageThreadId
            );

            if (!topic)
              throw new Error(
                `No topic found. Edit the topic name and try again!`
              );

            await deleteTelegramForward(client, topic.id, null);
            logger(
              `[TELEGRAM] ${topic.topic_name} can no longer receive messages`
            );
            await ctx.reply(
              `<b>${topic.topic_name}</b> can no longer receive messages`,
              {
                reply_to_message_id: messageThreadId,
                parse_mode: "HTML"
              }
            );
          } catch (error) {
            ctx.reply(`${error}`, {
              reply_to_message_id: messageThreadId
            });
          }
        });
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

      this.forwardBot.on(":forum_topic_edited", async (ctx) => {
        return traced("telegram", "forum_topic_edited", async (span) => {
          await sqlQueryWithPool(ctx.session.dbPool, async (client) => {
            const topicName = ctx.update?.message?.forum_topic_edited.name;
            const chatId = ctx.chat.id;
            const messageThreadId = ctx.update.message?.message_thread_id;
            span?.setAttributes({ topicName, messageThreadId, chatId });

            if (!chatId || !topicName)
              throw new Error(`Missing chatId or topic name`);

            const topic = await fetchTelegramTopic(
              client,
              chatId,
              messageThreadId
            );

            if (!topic) {
              logger(`[TELEGRAM] adding topic ${topicName} to db`);
              await insertTelegramChat(client, chatId);
              await insertTelegramTopic(
                client,
                chatId,
                topicName,
                messageThreadId,
                false
              );
            } else {
              logger(`[TELEGRAM] updating topic ${topicName} in db`);
              await insertTelegramTopic(
                client,
                topic.telegramChatID,
                topicName,
                topic.topic_id,
                topic.is_anon_topic
              );
            }
          });
        });
      });

      this.forwardBot.on("message", async (ctx) => {
        await sqlQueryWithPool(ctx.session.dbPool, async (client) => {
          const text = ctx.message.text;

          if (isDirectMessage(ctx)) {
            return await ctx.reply(
              `I can only forward messages in a group chat`
            );
          } else {
            const messageThreadId = ctx.message?.message_thread_id;

            try {
              // Check to see if message is from a topic in the forwarding table
              const forwardResults = await fetchTelegramTopicForwarding(
                client,
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
      });
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
   *
   * Because of its flakiness, this function retries up to MAX_RETRY_ATTEMPTS
   * times at an interval of RETRY_INTERVAL_SECONDS.
   */
  public async startBot(bot: Bot<BotContext, Api<RawApi>>): Promise<void> {
    return traced("telegram", "startBot", async (span) => {
      const startDelay = parseInt(
        process.env.TELEGRAM_BOT_START_DELAY_MS ?? "0"
      );
      let retryAttempts = 0;

      if (startDelay > 0) {
        logger(
          `[TELEGRAM] Delaying authBot startup by ${startDelay} milliseconds`
        );
        await sleep(startDelay);
      }

      logger(`[TELEGRAM] Starting ${bot.botInfo.username}`);

      while (retryAttempts++ < this.MAX_RETRY_ATTEMPTS) {
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
          return; // Exit the function if start is successful
        } catch (e) {
          logger(`[TELEGRAM] Error starting ${bot.botInfo.username}`, e);
          this.rollbarService?.reportError(e);

          retryAttempts++;
          if (retryAttempts >= this.MAX_RETRY_ATTEMPTS) {
            logger(
              `[TELEGRAM] Maximum retry attempts reached. Failed to start ${bot.botInfo.username}`
            );
            setError(e, span);
            await this.discordService?.sendAlert(
              `[TELEGRAM] Bot failed to start after ${this.MAX_RETRY_ATTEMPTS} attempts.\nError:\`\`\`\n${e}\`\`\`\n`
            );
            break; // Exit the loop if max attempts are reached
          }

          logger(
            `[TELEGRAM] Retrying to start ${bot.botInfo.username} in ${this.RETRY_INTERVAL_SECONDS} seconds...`
          );
          await sleep(this.RETRY_INTERVAL_SECONDS * 1_000); // Wait for RETRY_INTERVAL_SECONDS seconds before retrying
        }
      }
    });
  }

  /**
   * Returns all EdDSA public keys that have been whitelisted to
   * sign ticket PCDs that gate entry into Telegram groups. This
   * includes the Zupass public key that signs Zuzalu, Devconnect,
   * and ZuConnect PCDs, the Devcon public key that signs Devcon SEA
   * ticket PCDs, and the generic issuance public key that signs
   * all other ticket PCDs.
   *
   */
  private async getExpectedTicketSigners(): Promise<EdDSAPublicKey[]> {
    if (!process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY)
      throw new Error("Missing generic issuance eddsa private key .env value");
    const GENERIC_ISSUANCE_EDDSA_PUBKEY = await getEdDSAPublicKey(
      process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY
    );
    if (!process.env.SERVER_EDDSA_PRIVATE_KEY)
      throw new Error(`Missing server eddsa private key .env value`);
    const ZUPASS_EDDSA_PUBKEY = await getEdDSAPublicKey(
      process.env.SERVER_EDDSA_PRIVATE_KEY
    );
    return [
      ZUPASS_EDDSA_PUBKEY,
      DEVCON_2024_EDDSA_PUBKEY,
      GENERIC_ISSUANCE_EDDSA_PUBKEY
    ];
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

      const expectedSigners = await this.getExpectedTicketSigners();

      signerMatch = expectedSigners.some((expectedSigner) =>
        isEqualEdDSAPublicKey(expectedSigner, pcd.claim.signer)
      );

      span?.setAttribute("signerMatch", signerMatch);

      if (!signerMatch) {
        throw new Error("Signer of pcd is invalid");
      }

      if (
        // TODO: wrap in a MultiProcessService?
        await ZKEdDSAEventTicketPCDPackage.verify(pcd)
      ) {
        return pcd;
      } else {
        logger("[TELEGRAM] pcd invalid");
        return null;
      }
    });
  }

  private async sendToAnonymousChannel(
    client: PoolClient,
    chatId: number,
    topicId: number,
    message: string,
    reply_markup?: InlineKeyboardMarkup
  ): Promise<Message.TextMessage> {
    return traced(
      "telegram",
      "sendToAnonymousChannel",
      async (span): Promise<Message.TextMessage> => {
        span?.setAttribute("chatId", chatId);
        span?.setAttribute("topicId", topicId);
        span?.setAttribute("message", message);

        try {
          return await this.anonBot.api.sendMessage(chatId, message, {
            message_thread_id: topicId,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: { error_code: number; description: string } & any) {
          const isDeletedThread =
            error.error_code === 400 &&
            error.description === "Bad Request: message thread not found";
          if (isDeletedThread) {
            logger(
              `[TELEGRAM] topic has been deleted from Telegram, removing from db...`
            );
            await deleteTelegramChatTopic(client, chatId, topicId);
            throw new Error(`Topic has been deleted. Choose a different one!`);
          } else {
            throw new Error(error);
          }
        }
      }
    );
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
   * This is called from the /telegram/verify route.
   */
  public async handleVerification(
    client: PoolClient,
    serializedPCD: string,
    telegramUserId: number,
    telegramChatId: string,
    telegramUsername?: string
  ): Promise<void> {
    return traced("telegram", "handleVerification", async (span) => {
      span?.setAttribute("chatId", telegramChatId);
      const chat = await getGroupChat(this.authBot.api, telegramChatId);
      span?.setAttribute("chatTitle", chat.title);

      const parsed = JSON.parse(serializedPCD) as SerializedPCD;
      if (parsed.type === ZKEdDSAEventTicketPCDTypeName) {
        await this.handleTicketVerification(
          client,
          serializedPCD,
          telegramUserId,
          chat.id,
          telegramUsername
        );
      } else if (parsed.type === ZKEdDSAFrogPCDTypeName) {
        await handleFrogVerification(
          client,
          serializedPCD,
          telegramUserId,
          chat.id,
          telegramUsername
        );
      } else {
        throw new Error(`Unsupported PCD Type`);
      }

      // Send invite link
      await this.sendInviteLink(telegramUserId, chat);
    });
  }

  /**
   * Verify that a PCD relates to an event, and that the event has an
   * associated chat. If so, invite the user to the chat and record them
   * for later approval when they request to join.
   */
  public async handleTicketVerification(
    client: PoolClient,
    serializedZKEdDSATicket: string,
    telegramUserId: number,
    telegramChatId: number,
    telegramUsername?: string
  ): Promise<void> {
    return traced("telegram", "handleTicketVerification", async (span) => {
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

      const { attendeeSemaphoreId, productId } = pcd.claim.partialTicket;

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

      const eventsByChat = await fetchTelegramEventsByChatId(
        client,
        telegramChatId
      );
      if (eventsByChat.length === 0)
        throw new Error(`No valid events found for given chat`);
      if (!verifyUserEventIds(eventsByChat, validEventIds)) {
        throw new Error(`User submitted event Ids are invalid `);
      }

      const expectedProductId = getProductIdFromTelegramChat(telegramChatId);
      if (expectedProductId && productId !== expectedProductId) {
        throw new Error(
          `Product id ${productId} does not match expected product id ${expectedProductId}`
        );
      }

      logger(
        `[TELEGRAM] Verified PCD for ${telegramUserId}, chat ${telegramChatId}` +
          (telegramUsername && `, username ${telegramUsername}`)
      );

      // We've verified that the chat exists, now add the user to our list.
      // This will be important later when the user requests to join.
      await insertTelegramVerification(
        client,
        telegramUserId,
        telegramChatId,
        attendeeSemaphoreId,
        telegramUsername
      );
    });
  }

  public async handleRequestReactProofLink(
    client: PoolClient,
    anonPayload: ReactDataPayload
  ): Promise<string> {
    const react = decodeURIComponent(anonPayload.react);
    logger(`[TELEGRAM] got react`, react);
    logger(`[TELEGRAM] payoad id`, anonPayload.anonMessageId);
    const message = await fetchTelegramAnonMessagesById(
      client,
      anonPayload.anonMessageId
    );
    if (!message) throw new Error(`Message to react to not found`);

    // Get valid event Ids
    const events = await fetchTelegramEventsByChatId(
      client,
      message.telegram_chat_id
    );
    if (events.length === 0)
      throw new Error(`No valid events found for chat id`);
    const validEventIds = events.map((e) => e.ticket_event_id);

    // Construct proof url
    const proofUrl = await generateReactProofUrl(
      validEventIds,
      message.telegram_chat_id,
      message.id.toString(),
      anonPayload.react
    );
    logger(`[TELEGRAM] react proof url`, proofUrl);
    return proofUrl;
  }

  public async handleReactAnonymousMessage(
    client: PoolClient,
    serializedZKEdDSATicket: string,
    telegramChatId: string,
    anonMessageId: string,
    reaction: string
  ): Promise<void> {
    return traced("telegram", "handleReactAnonymousMessage", async (span) => {
      logger("[TELEGRAM] Reacting to anonymous message", reaction);

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
      span?.setAttribute("validEventIds", validEventIds);

      if (!nullifierHash) throw new Error(`Nullifier hash not found`);

      const expectedExternalNullifier = getAnonTopicNullifier().toString();

      if (externalNullifier !== expectedExternalNullifier)
        throw new Error("Nullifier mismatch - try proving again.");

      span?.setAttribute("externalNullifier", externalNullifier);

      const eventsByChat = await fetchTelegramEventsByChatId(
        client,
        telegramChatId
      );
      if (eventsByChat.length === 0)
        throw new Error(`No valid events found for given chat`);
      if (!verifyUserEventIds(eventsByChat, validEventIds)) {
        throw new Error(`User submitted event Ids are invalid `);
      }

      span?.setAttribute("chatId", telegramChatId);

      if (!watermark) {
        throw new Error("Anonymous reaction PCD did not contain watermark");
      }
      if (!isValidEmoji(reaction)) {
        throw new Error("Invalid watermark");
      }
      span?.setAttribute("watermark", watermark);

      const preimage = encodeAnonMessageIdAndReaction(
        anonMessageId,
        encodeURIComponent(reaction) // This is because the reaction is hashed as encoded originally
      );
      if (getMessageWatermark(preimage).toString() !== watermark.toString()) {
        throw new Error(
          `Anonymous reaction string ${preimage} didn't match watermark. got ${watermark} and expected ${getMessageWatermark(
            preimage
          ).toString()}`
        );
      }

      const anonMessage = await fetchTelegramAnonMessagesById(
        client,
        anonMessageId
      );
      if (!anonMessage) {
        logger(
          "[TELEGRAM] anonMessage falsy, anonMessageId parameter points to a nonexistent record",
          { anonMessageId }
        );
        throw new Error("This anonymous message does not exist");
      }

      if (anonMessage.nullifier === nullifierHash) {
        logger("[TELEGRAM] User tried to react to own message", {
          nullifierHash
        });
        throw new Error("Cannot react to your own message");
      }

      try {
        await insertTelegramReaction(
          client,
          serializedZKEdDSATicket,
          anonMessageId,
          reaction,
          nullifierHash
        );
      } catch (e) {
        // Receiving this error message means that the user tried to
        // react with the same reaction twice to a message.
        if (
          e instanceof Error &&
          e.message.includes(
            "telegram_chat_reactions_sender_nullifier_anon_message_id_re_key"
          )
        ) {
          throw new Error(
            `Cannot react more than once with ${reaction} to this message`
          );
        }
      }

      const reactionsForMessage = await fetchTelegramReactionsForMessage(
        client,
        anonMessageId
      );

      const allEmojis = _.uniq([
        ...getDisplayEmojis(new Date(anonMessage.message_timestamp)),
        ...reactionsForMessage.map((rc) => rc.reaction)
      ]);
      const payloads = allEmojis.map((emoji) => {
        return {
          emoji,
          payload: encodePayload(buildReactPayload(emoji, anonMessageId))
        };
      });

      const link = process.env.TELEGRAM_ANON_BOT_DIRECT_LINK;
      const buttons: InlineKeyboardButton[] = payloads.map((p) => {
        const reactCount = reactionsForMessage.find(
          (f) => f.reaction === p.emoji
        );
        return {
          text: `${p.emoji} ${reactCount ? reactCount.count : ""}`,
          url: `${link}?startApp=${p.payload}&startapp=${p.payload}`
        };
      });

      const message = await fetchTelegramAnonMessagesById(
        client,
        anonMessageId
      );
      if (!message) throw new Error(`Message to react to not found`);

      await this.anonBot.api.editMessageReplyMarkup(
        telegramChatId,
        parseInt(message.sent_message_id),
        { reply_markup: { inline_keyboard: [buttons] } }
      );
    });
  }

  public async handleSendAnonymousMessage(
    serializedZKEdDSATicket: string,
    rawMessage: string,
    telegramChatId: string,
    topicId: string
  ): Promise<void> {
    return traced("telegram", "handleSendAnonymousMessage", async (span) => {
      return sqlQueryWithPool(this.context.dbPool, async (client) => {
        span?.setAttribute("topicId", topicId);
        span?.setAttribute("message", rawMessage);

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

        const eventsByChat = await fetchTelegramEventsByChatId(
          client,
          telegramChatId
        );
        if (eventsByChat.length === 0)
          throw new Error(`No valid events found for given chat`);
        if (!verifyUserEventIds(eventsByChat, validEventIds)) {
          throw new Error(`User submitted event Ids are invalid `);
        }

        span?.setAttribute("chatId", telegramChatId);

        if (!watermark) {
          throw new Error("Anonymous message PCD did not contain watermark");
        }

        if (
          getMessageWatermark(rawMessage).toString() !== watermark.toString()
        ) {
          throw new Error(
            `Anonymous message string ${rawMessage} didn't match watermark. got ${watermark} and expected ${getMessageWatermark(
              rawMessage
            ).toString()}`
          );
        }

        logger(
          `[TELEGRAM] Verified PCD for anonynmous message with events ${validEventIds}`
        );

        const topic = await fetchTelegramTopic(
          client,
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

        const expectedExternalNullifier = getAnonTopicNullifier().toString();

        if (externalNullifier !== expectedExternalNullifier)
          throw new Error("Nullifier mismatch - try proving again.");

        const nullifierData = await fetchAnonTopicNullifier(
          client,
          nullifierHash,
          topic.id
        );

        const currentTime = new Date();
        const timestamp = currentTime.toISOString();

        if (!nullifierData) {
          await insertOrUpdateTelegramNullifier(
            client,
            nullifierHash,
            [timestamp],
            topic.id
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
              client,
              nullifierHash,
              newTimestamps,
              topic.id
            );
          } else {
            const rlError = new Error(
              `You have exceeded the daily limit of ${maxDailyPostsPerTopic} messages for this topic.`
            );
            rlError.name = "Rate limit exceeded";
            throw rlError;
          }
        }

        const payloadData: NullifierHashPayload = {
          type: PayloadType.NullifierHash,
          value: BigInt(nullifierHash).toString()
        };

        const encodedPayload = Buffer.from(
          JSON.stringify(payloadData),
          "utf-8"
        ).toString("base64");

        const formattedMessage = `
      <b>${bigIntToPseudonymEmoji(BigInt(nullifierHash))} <u><a href="${
        process.env.TELEGRAM_ANON_BOT_DIRECT_LINK
      }?startApp=${encodedPayload}&startapp=${encodedPayload}">${bigIntToPseudonymName(
        BigInt(nullifierHash)
      )}</a></u></b>\n\n${rawMessage}\n\n<i>submitted ${currentTime.toLocaleString(
        "en-GB"
      )}</i>\n----------------------------------------------------------`;

        const anonMessageId = uuidV1();

        const payloads = getDisplayEmojis().map((emoji) => {
          return {
            emoji,
            payload: encodePayload(buildReactPayload(emoji, anonMessageId))
          };
        });
        const link = process.env.TELEGRAM_ANON_BOT_DIRECT_LINK;
        const buttons: InlineKeyboardButton[] = payloads.map((p) => {
          return {
            text: `${p.emoji}`,
            url: `${link}?startApp=${p.payload}&startapp=${p.payload}`
          };
        });

        const replyMarkup: InlineKeyboardMarkup = {
          inline_keyboard: [buttons]
        };
        const message = await this.sendToAnonymousChannel(
          client,
          chat.id,
          parseInt(topic.topic_id),
          formattedMessage,
          replyMarkup
        );
        if (!message) throw new Error(`Failed to send telegram message`);

        await insertTelegramAnonMessage(
          client,
          anonMessageId,
          nullifierHash,
          topic.id,
          rawMessage,
          serializedZKEdDSATicket,
          timestamp,
          message.message_id
        );
      });
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
        return sqlQueryWithPool(this.context.dbPool, async (client) => {
          // Confirm that topicId exists and is anonymous
          const topic = await fetchTelegramTopic(
            client,
            telegramChatId,
            topicId
          );

          if (!topic || !topic.is_anon_topic || !topic.topic_id)
            throw new Error(`No anonymous topic found`);

          // Get valid eventIds for this chat
          const telegramEvents = await fetchTelegramEventsByChatId(
            client,
            telegramChatId
          );
          if (telegramEvents.length === 0)
            throw new Error(`No events associated with this group`);

          const validEventIds = telegramEvents.map((e) => e.ticket_event_id);

          const encodedTopicData = encodeTopicData({
            type: PayloadType.AnonTopicDataPayload,
            value: {
              chatId: telegramChatId,
              topicName: topic.topic_name,
              topicId: parseInt(topic.topic_id),
              validEventIds
            }
          });

          const url = `${process.env.TELEGRAM_ANON_WEBSITE}?tgWebAppStartParam=${encodedTopicData}`;
          span?.setAttribute(`redirect url`, url);
          logger(
            `[TELEGRAM] generated redirect url to ${process.env.TELEGRAM_ANON_WEBSITE}`
          );

          return url;
        });
      }
    );
  }

  public async handleGetAnonTotalKarma(
    client: PoolClient,
    nulliferHash: string
  ): Promise<number> {
    return traced("telegram", "handleGetAnonTotalKarma", async () => {
      const totalKarma = await fetchTelegramTotalKarmaForNullifier(
        client,
        nulliferHash
      );
      return totalKarma;
    });
  }

  public async handleGetAnonMessages(
    client: PoolClient,
    nullifierHash: string
  ): Promise<AnonMessageWithDetails[]> {
    return traced("telegram", "handleGetAnonMessages", async () => {
      const messages = await fetchTelegramAnonMessagesWithTopicByNullifier(
        client,
        nullifierHash
      );

      const chatIdCache: Record<number, string> = {};

      const detailedMessages = messages.map(
        async (m: AnonMessageWithDetails) => {
          try {
            if (!chatIdCache[m.telegram_chat_id]) {
              const chat = (await this.anonBot.api.getChat(
                m.telegram_chat_id
              )) as TopicChat;
              if (!chat) throw new Error(`Chat not found`);
              chatIdCache[m.telegram_chat_id] = chat?.title;
              return {
                ...m,
                chat_name: chat?.title
              };
            } else {
              return {
                ...m,
                chat_name: chatIdCache[m.telegram_chat_id]
              };
            }
          } catch (e) {
            logger(`[TELEGRAM] Error fetching message details`, e);
            return null;
          }
        }
      );

      const settled = await Promise.allSettled(detailedMessages);
      return settled
        .filter(isFulfilled)
        .filter((m) => m !== null)
        .map((m) => m.value) as AnonMessageWithDetails[];
    });
  }

  public async stop(): Promise<void> {
    await this.authBot.stop();
    await this.anonBot.stop();
    await this.forwardBot?.stop();
  }

  public ping(): UserFromGetMe {
    return this.authBot.botInfo;
  }
}

export async function startTelegramService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  discordService: DiscordService | null
): Promise<TelegramService | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const anonBotToken = process.env.TELEGRAM_ANON_BOT_TOKEN;
  const forwardBotToken = process.env.TELEGRAM_FORWARD_BOT_TOKEN;
  const anonBotExists = !!(anonBotToken && anonBotToken !== botToken);

  if (![ServerMode.UNIFIED, ServerMode.PARALLEL_MAIN].includes(context.mode)) {
    logger(
      `[INIT] telegram service not started, not in unified or parallel main mode`
    );
    return null;
  }

  if (process.env.SELF_HOSTED_PODBOX_MODE === "true") {
    logger(
      `[INIT] SELF_HOSTED_PODBOX_MODE is true - not starting telegram service`
    );
    return null;
  }

  if (process.env.TELEGRAM_BOT_DISABLED === "true") {
    logger(
      `[INIT] TELEGRAM_BOT_DISABLED is true - not starting telegram service`
    );
    return null;
  }

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
  let forwardBot: Bot<BotContext> | undefined = undefined;
  let anonBotURL: string;

  if (anonBotExists) {
    anonBot = new Bot<BotContext>(anonBotToken);
    await anonBot.init();
    anonBotURL = await getBotURL(anonBot);
  } else {
    anonBot = authBot;
    anonBotURL = authBotURL;
  }

  if (forwardBotToken) {
    forwardBot = new Bot<BotContext>(forwardBotToken);
    await forwardBot.init();
  }

  // Start sessions
  const initial = (): SessionData => ({
    dbPool: context.dbPool,
    anonBotExists,
    authBotURL,
    anonBotURL,
    directLinkMode: false
  });

  if (anonBotExists) {
    anonBot.use(session({ initial, getSessionKey }));
    anonBot.catch((error) => logger(`[TELEGRAM] Bot error`, error));
  }
  if (forwardBot) {
    forwardBot.use(session({ initial, getSessionKey }));
    forwardBot.catch((error) => logger(`[TELEGRAM] Bot error`, error));
  }

  authBot.use(session({ initial, getSessionKey }));
  authBot.catch((error) => logger(`[TELEGRAM] Bot error`, error));

  const service = new TelegramService(
    context,
    rollbarService,
    discordService,
    authBot,
    anonBot,
    forwardBot
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
  if (forwardBot) {
    service.startBot(forwardBot);
    forwardBot.api.config.use(
      autoRetry({
        maxRetryAttempts: 3, // only repeat requests once
        maxDelaySeconds: 5 // fail immediately if we have to wait >5 seconds
      })
    );
  }

  return service;
}
