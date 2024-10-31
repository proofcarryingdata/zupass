import { MenuRange } from "@grammyjs/menu";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  AnonTopicDataPayload,
  AnonWebAppPayload,
  PayloadType,
  ReactDataPayload,
  constructZupassPcdGetRequestUrl
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  ZUPASS_SUPPORT_EMAIL,
  encodeAnonMessageIdAndReaction,
  getAnonTopicNullifier,
  getMessageWatermark
} from "@pcd/util";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { Api, Bot, Context, RawApi, SessionFlavor } from "grammy";
import {
  BotCommand,
  Chat,
  ChatMemberAdministrator,
  ChatMemberOwner
} from "grammy/types";
import { Pool, PoolClient } from "postgres-pool";
import {
  ChatIDWithEventsAndMembership,
  LinkedPretixTelegramEvent,
  TelegramEvent,
  TelegramTopicFetch,
  TelegramTopicWithFwdInfo
} from "../database/models";
import {
  deleteTelegramEvent,
  deleteTelegramForward
} from "../database/queries/telegram/deleteTelegramEvent";
import {
  fetchEventsWithTelegramChats,
  fetchTelegramAnonTopicsByChatId,
  fetchTelegramChatsWithMembershipStatus,
  fetchTelegramEventsByChatId,
  fetchTelegramTopic,
  fetchTelegramTopicsReceiving
} from "../database/queries/telegram/fetchTelegramEvent";
import {
  insertTelegramChat,
  insertTelegramEvent,
  insertTelegramForward
} from "../database/queries/telegram/insertTelegramConversation";
import { namedSqlTransaction, sqlTransaction } from "../database/sqlQuery";
import { traced } from "../services/telemetryService";
import { generateFrogProofUrl } from "./frogTelegramHelpers";
import { logger } from "./logger";

// If an event name contains this value, we will use frog proof instead of ticket proof
export const FROG_SLUG = "71209";

export type TopicChat = Chat.SupergroupChat | null;

type ChatIDWithChat<T extends { telegramChatID?: string }> = T & {
  chat: TopicChat;
};

interface BotCommandWithAnon extends BotCommand {
  isAnon: boolean;
  alwaysInclude?: boolean;
}

export interface SessionData {
  dbPool: Pool;
  selectedEvent?: LinkedPretixTelegramEvent;
  anonBotExists: boolean;
  authBotURL: string;
  directLinkMode: boolean;
  anonBotURL: string;
  lastMessageId?: number;
  selectedChat?: TopicChat;
  chatToJoin?: ChatIDWithChat<ChatIDWithEventsAndMembership>;
  topicToForwardTo?: ChatIDWithChat<TelegramTopicWithFwdInfo>;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export const getGroupChat = async (
  api: Api<RawApi>,
  chatId: string | number
): Promise<Chat.SupergroupChat> => {
  return traced("telegram", "getGroupChat", async (span) => {
    span?.setAttribute("chatId", chatId);
    const chat = await api.getChat(chatId);
    if (!chat) throw new Error(`No chat found for id ${chatId}`);
    if (isGroupWithTopics(chat)) return chat as Chat.SupergroupChat;
    else throw new Error(`Chat is not a group with topics enabled`);
  });
};

const privateChatCommands: BotCommandWithAnon[] = [
  {
    command: "/start",
    description: "Join a group with a proof of ticket or frog",
    isAnon: false
  },
  {
    command: "/anonsend",
    description: "Send an anonymous message",
    isAnon: true
  },
  {
    command: "/help",
    description: "Get help",
    isAnon: false,
    alwaysInclude: true
  }
];

const adminGroupChatCommands: BotCommandWithAnon[] = [
  {
    command: "/incognito",
    description: "Set a topic for anonymous posting",
    isAnon: true
  },
  {
    command: "/manage",
    description: "Link this chat to events",
    isAnon: false
  },
  {
    command: "/setup",
    description:
      "Initialize a group chat with an Admin and Announcements topic",
    isAnon: false
  },
  {
    command: "/adminhelp",
    description: "Get info in a DM about the group and linked events",
    isAnon: false
  }
];

export const encodeTopicData = (topicData: AnonTopicDataPayload): string => {
  return encodeURIComponent(JSON.stringify(topicData));
};

function isFulfilled<T>(
  promiseSettledResult: PromiseSettledResult<T>
): promiseSettledResult is PromiseFulfilledResult<T> {
  return promiseSettledResult.status === "fulfilled";
}

export const getBotURL = async (
  bot: Bot<BotContext, Api<RawApi>>
): Promise<string> => {
  const { username } = await bot.api.getMe();
  return `https://t.me/${username}`;
};

export const setBotInfo = async (
  bot: Bot<BotContext, Api<RawApi>>,
  anonBot: Bot<BotContext, Api<RawApi>>,
  anonBotExists: boolean,
  forwardBot?: Bot<BotContext, Api<RawApi>>
): Promise<void> => {
  // Set Zupass as the default menu item
  if (process.env.PASSPORT_CLIENT_URL) {
    bot.api.setChatMenuButton({
      menu_button: {
        web_app: { url: process.env.PASSPORT_CLIENT_URL + "/#telegram" },
        type: "web_app",
        text: "Zupass"
      }
    });
  }

  if (anonBotExists) {
    anonBot.api.setChatMenuButton({
      menu_button: {
        web_app: { url: process.env.PASSPORT_CLIENT_URL + "/#telegram" },
        type: "web_app",
        text: "Zupass"
      }
    });

    anonBot.api.setMyDescription(
      "I'm ZuRat! I send anonmyous messages with zero-knowledge proofs"
    );

    anonBot.api.setMyShortDescription(
      "ZuRat sends anonmyous messages with zero-knowledge proofs"
    );

    anonBot.api.setMyCommands(
      privateChatCommands.filter((c) => c.isAnon || c.alwaysInclude),
      { scope: { type: "all_private_chats" } }
    );

    anonBot.api.setMyCommands(
      adminGroupChatCommands.filter((c) => c.isAnon || c.alwaysInclude),
      {
        scope: { type: "all_chat_administrators" }
      }
    );

    // Only add non-anon commands to main bot
    bot.api.setMyCommands(
      adminGroupChatCommands.filter((c) => !c.isAnon || c.alwaysInclude),
      {
        scope: { type: "all_chat_administrators" }
      }
    );

    bot.api.setMyCommands(
      privateChatCommands.filter((c) => !c.isAnon || c.alwaysInclude),
      {
        scope: { type: "all_private_chats" }
      }
    );
  } else {
    bot.api.setMyCommands(adminGroupChatCommands, {
      scope: { type: "all_chat_administrators" }
    });

    bot.api.setMyCommands(privateChatCommands, {
      scope: { type: "all_private_chats" }
    });
  }

  bot.api.setMyDescription(
    "I'm ZuKat! I manage fun events with zero-knowledge proofs. Press START to begin 😽"
  );

  bot.api.setMyShortDescription(
    "ZuKat manages events and groups with zero-knowledge proofs"
  );

  if (forwardBot) {
    forwardBot.api.setMyDescription(
      `To join the Devconnect Community Hub, send a DM here: https://t.me/zucat_bot?start=auth`
    );
    forwardBot.api.setMyShortDescription(
      `To join the Devconnect Community Hub, send a DM here: https://t.me/zucat_bot?start=auth`
    );
  }
};

/**
 * Fetches the chat object for a list contaning a telegram chat id
 */
export const chatIDsToChats = async <T extends { telegramChatID?: string }>(
  ctx: BotContext,
  chats: T[]
): Promise<ChatIDWithChat<T>[]> => {
  return traced("telegram", "chatIDsToChats", async () => {
    const chatIDsToChatRequests = chats.map(async (e) => {
      return {
        ...e,
        chat: e.telegramChatID
          ? ((await ctx.api.getChat(e.telegramChatID)) as TopicChat)
          : null
      };
    });
    const eventsWithChatsSettled = await Promise.allSettled(
      chatIDsToChatRequests
    );

    const eventsWithChats = eventsWithChatsSettled
      .filter(isFulfilled)
      .map((e) => e.value);

    return eventsWithChats;
  });
};

export const verifyUserEventIds = (
  chats: TelegramEvent[],
  userEventIds: string[]
): boolean => {
  if (userEventIds.length === 0) return false;
  const set = new Set(chats.map((chat) => chat.ticket_event_id));
  // userEventIds is a subset or equal to the known events associated with the chat
  return userEventIds.every((userEventId) => set.has(userEventId));
};

export const senderIsAdmin = async (
  ctx: Context,
  admins?: (ChatMemberOwner | ChatMemberAdministrator)[]
): Promise<boolean> => {
  const adminList = admins || (await ctx.getChatAdministrators());
  const username = ctx.from?.username;
  const admin =
    !!username && !!adminList.find((a) => a.user.username === username);
  if (!admin) logger("[TELEGRAM]", username, `is not an admin`);
  return admin;
};

export const getSessionKey = (ctx: Context): string | undefined => {
  // Give every user their one personal session storage per chat with the bot
  // (an independent session for each group and their private chat)
  return ctx.from === undefined || ctx.chat === undefined
    ? undefined
    : `${ctx.from.id}/${ctx.chat.id}`;
};

export const isDirectMessage = (ctx: Context): boolean => {
  return !!(ctx.chat?.type && ctx.chat?.type === "private");
};

export const isGroupWithTopics = (chat: Chat): boolean => {
  return !!(chat?.type && chat?.type === "supergroup");
};

const checkDeleteMessage = (ctx: BotContext): void => {
  if (ctx.chat?.id && ctx.session?.lastMessageId) {
    ctx.api.deleteMessage(ctx.chat.id, ctx.session.lastMessageId);
    ctx.session.lastMessageId = 0;
  }
};

const editOrSendMessage = async (
  ctx: BotContext,
  replyText: string
): Promise<void> => {
  if (ctx.chat?.id && ctx.session.lastMessageId) {
    await ctx.api.editMessageText(
      ctx.chat?.id,
      ctx.session.lastMessageId,
      "...",
      {
        parse_mode: "HTML"
      }
    );
    await ctx.api.editMessageText(
      ctx.chat?.id,
      ctx.session.lastMessageId,
      replyText,
      {
        parse_mode: "HTML"
      }
    );
  } else {
    const msg = await ctx.reply(replyText, { parse_mode: "HTML" });
    ctx.session.lastMessageId = msg.message_id;
  }
};

const generateProofUrl = async (
  telegramUserId: number,
  telegramChatId: string,
  validEventIds: string[],
  eventNames: string[],
  telegramUsername?: string
): Promise<string> => {
  if (eventNames.find((e) => e.endsWith(FROG_SLUG))) {
    logger(`[TELEGRAM] found frog event`, eventNames);
    return await generateFrogProofUrl(
      telegramUserId,
      telegramChatId,
      telegramUsername
    );
  }

  return await generateTicketProofUrl(
    telegramUserId,
    telegramChatId,
    validEventIds,
    telegramUsername
  );
};

const generateTicketProofUrl = async (
  telegramUserId: number,
  telegramChatId: string,
  validEventIds: string[],
  telegramUsername?: string
): Promise<string> => {
  return traced("telegram", "generateTicketProofUrl", async (span) => {
    span?.setAttribute("userId", telegramUserId.toString());
    span?.setAttribute("validEventIds", validEventIds);

    const fieldsToReveal: EdDSATicketFieldsToReveal = {
      revealTicketId: false,
      revealEventId: false,
      revealProductId: false,
      revealTimestampConsumed: false,
      revealTimestampSigned: false,
      revealAttendeeSemaphoreId: true,
      revealIsConsumed: false,
      revealIsRevoked: false
    };

    const args: ZKEdDSAEventTicketPCDArgs = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: EdDSATicketPCDPackage.name,
        value: undefined,
        userProvided: true,
        displayName: "Your Ticket",
        description: "",
        validatorParams: {
          eventIds: validEventIds,
          productIds: [],
          // TODO: surface which event ticket we are looking for
          notFoundMessage: "You don't have a ticket to this event."
        },
        hideIcon: true
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        value: fieldsToReveal,
        userProvided: false,
        hideIcon: true
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        value: undefined,
        userProvided: false
      },
      validEventIds: {
        argumentType: ArgumentTypeName.StringArray,
        value: validEventIds,
        userProvided: false
      },
      watermark: {
        argumentType: ArgumentTypeName.BigInt,
        value: telegramUserId.toString(),
        userProvided: false,
        description: `This encodes your Telegram user ID so that the proof can grant only you access to the TG group.`
      }
    };

    let passportOrigin = `${process.env.PASSPORT_CLIENT_URL}/`;
    if (passportOrigin === "http://localhost:3000/") {
      // TG bot doesn't like localhost URLs
      passportOrigin = "http://127.0.0.1:3000/";
    }

    // pass telegram username as path param if nonempty
    let returnUrl = `${process.env.PASSPORT_SERVER_URL}/telegram/verify?chatId=${telegramChatId}&userId=${telegramUserId}`;
    if (telegramUsername && telegramUsername.length > 0)
      returnUrl += `&username=${telegramUsername}`;

    span?.setAttribute("returnUrl", returnUrl);

    const proofUrl = constructZupassPcdGetRequestUrl<
      typeof ZKEdDSAEventTicketPCDPackage
    >(passportOrigin, returnUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
      genericProveScreen: true,
      title: "",
      description:
        "ZuKat requests a zero-knowledge proof of your ticket to join a Telegram group."
    });
    span?.setAttribute("proofUrl", proofUrl);

    return proofUrl;
  });
};

export const generateReactProofUrl = async (
  validEventIds: string[],
  telegramChatId: string,
  anonMessageId: string,
  reaction: string
): Promise<string> => {
  return traced("telegram", "generateReactProofUrl", async (span) => {
    span?.setAttribute("validEventIds", validEventIds);

    // Construct watermark:
    const watermark = getMessageWatermark(
      encodeAnonMessageIdAndReaction(anonMessageId, reaction)
    ).toString();
    span?.setAttribute("watermark", watermark);
    const fieldsToReveal: EdDSATicketFieldsToReveal = {
      revealTicketId: false,
      revealEventId: false,
      revealProductId: false,
      revealTimestampConsumed: false,
      revealTimestampSigned: false,
      revealAttendeeSemaphoreId: false,
      revealIsConsumed: false,
      revealIsRevoked: false
    };

    const args: ZKEdDSAEventTicketPCDArgs = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: EdDSATicketPCDPackage.name,
        value: undefined,
        userProvided: true,
        displayName: "Your Ticket",
        description: "",
        validatorParams: {
          eventIds: validEventIds,
          productIds: [],
          // TODO: surface which event ticket we are looking for
          notFoundMessage: "You don't have a ticket to this event."
        },
        hideIcon: true
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        value: fieldsToReveal,
        description: "No ticket information will be revealed",
        userProvided: false,
        hideIcon: true
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        value: getAnonTopicNullifier().toString(),
        userProvided: false
      },
      validEventIds: {
        argumentType: ArgumentTypeName.StringArray,
        value: validEventIds,
        userProvided: false
      },
      watermark: {
        argumentType: ArgumentTypeName.BigInt,
        value: watermark,
        userProvided: false,
        description: `The reaction type and post you are reacting to.`
      }
    };

    let passportOrigin = `${process.env.PASSPORT_CLIENT_URL}/`;
    if (passportOrigin === "http://localhost:3000/") {
      // TG bot doesn't like localhost URLs
      passportOrigin = "http://127.0.0.1:3000/";
    }

    // pass telegram username as path param if nonempty
    const returnUrl = `${process.env.PASSPORT_SERVER_URL}/telegram/anonreact?anonMessageId=${anonMessageId}&reaction=${reaction}&chatId=${telegramChatId}`;
    span?.setAttribute("returnUrl", returnUrl);

    const proofUrl = constructZupassPcdGetRequestUrl<
      typeof ZKEdDSAEventTicketPCDPackage
    >(passportOrigin, returnUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
      genericProveScreen: true,
      title: `${decodeURIComponent(reaction)} ZK React`,
      description:
        "ZuRat requests a zero-knowledge proof of your ticket to react to a message."
    });
    span?.setAttribute("proofUrl", proofUrl);

    return proofUrl;
  });
};

export const getChatsWithMembershipStatus = async (
  client: PoolClient,
  ctx: BotContext,
  userId: number,
  chatId?: number // if chatId is provided, only fetch chats with that id
): Promise<ChatIDWithChat<ChatIDWithEventsAndMembership>[]> => {
  return traced("telegram", "getChatsWithMembershipStatus", async (span) => {
    span?.setAttribute("userId", userId.toString());

    const chatIdsWithMembership = await fetchTelegramChatsWithMembershipStatus(
      client,
      userId,
      chatId
    );
    const chatsWithMembership = await chatIDsToChats(
      ctx,
      chatIdsWithMembership
    );

    return chatsWithMembership;
  });
};

export const eventsToLink = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
  const db = ctx.session.dbPool;
  if (!db) {
    range.text(`Database not connected. Try again...`);
    return;
  }
  const chatId = ctx.chat?.id;
  if (!chatId) {
    {
      range.text(`No chat id found`);
      return;
    }
  }
  // If an event is selected, give the option to add or remove it from the chat
  // based on if it is already linked or not
  const event = ctx.session.selectedEvent;
  if (event) {
    range
      .text(
        `↰ ${event.isLinkedToCurrentChat ? "✅" : ""} ${event.eventName}`,
        async (ctx) => {
          if (!(await senderIsAdmin(ctx))) return;
          checkDeleteMessage(ctx);
          ctx.session.selectedEvent = undefined;
          await ctx.menu.update({ immediate: true });
        }
      )
      .row();
    range
      .text(
        `Yes, ${event.isLinkedToCurrentChat ? "remove" : "add"}`,
        async (ctx) => {
          await sqlTransaction(ctx.session.dbPool, async (client) => {
            let replyText = "";
            if (!(await senderIsAdmin(ctx))) return;

            if (!event.isLinkedToCurrentChat) {
              replyText = `<i>Added ${event.eventName} from chat</i>`;
              await insertTelegramChat(client, chatId);
              await insertTelegramEvent(client, event.configEventID, chatId);
              await editOrSendMessage(ctx, replyText);
            } else {
              replyText = `<i>Removed ${event.eventName} to chat</i>`;
              await deleteTelegramEvent(client, event.configEventID);
            }
            ctx.session.selectedEvent = undefined;
            await ctx.menu.update({ immediate: true });
            await editOrSendMessage(ctx, replyText);
          });
        }
      )
      .row();
  }
  // Otherwise, display all events to add or remove.
  else {
    const events = await sqlTransaction(ctx.session.dbPool, (client) =>
      fetchEventsWithTelegramChats(client, true, chatId)
    );

    for (const event of events) {
      range
        .text(
          `${event.isLinkedToCurrentChat ? "✅" : ""} ${event.eventName}`,
          async (ctx) => {
            if (!(await senderIsAdmin(ctx))) return;
            ctx.session.selectedEvent = event;
            await ctx.menu.update({ immediate: true });
            let initText = "";
            if (event.isLinkedToCurrentChat) {
              initText = `<i>Users with tickets for ${event.eventName} will NOT be able to join this chat</i>`;
            } else {
              initText = `<i>Users with tickets for ${event.eventName} will be able to join this chat</i>`;
            }
            await editOrSendMessage(ctx, initText);
          }
        )
        .row();
    }
  }
};

export const chatsToJoin = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
  return traced("telegram", "chatsToJoin", async (span) => {
    const db = ctx.session.dbPool;
    if (!db) {
      range.text(`Database not connected. Try again...`);
      return;
    }
    const userId = ctx.from?.id;
    if (!userId) {
      range.text(`User not found. Try again...`);
      return;
    }
    span?.setAttribute("userId", userId?.toString());

    const chatsWithMembership = await sqlTransaction(
      ctx.session.dbPool,
      (client) => getChatsWithMembershipStatus(client, ctx, userId)
    );

    if (chatsWithMembership.length === 0) {
      range.text(`No groups to join at this time`);
      return;
    }

    const telegramUsername = ctx.from?.username;

    for (const chat of chatsWithMembership) {
      if (chat.isChatMember) {
        const invite = await ctx.api.createChatInviteLink(chat.telegramChatID, {
          creates_join_request: true
        });
        range.url(`✅ ${chat.chat?.title}`, invite.invite_link).row();
        range.row();
      } else {
        const proofUrl = await generateProofUrl(
          userId,
          chat.telegramChatID,
          chat.ticketEventIds,
          chat.eventNames,
          telegramUsername
        );
        range.webApp(`${chat.chat?.title}`, proofUrl).row();
      }
    }
  });
};

export const chatsToJoinV2 = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
  return traced("telegram", "chatsToJoinV2", async (span) => {
    const db = ctx.session.dbPool;
    if (!db) {
      range.text(`Database not connected. Try again...`);
      return;
    }
    const userId = ctx.from?.id;
    if (!userId) {
      range.text(`User not found. Try again...`);
      return;
    }
    span?.setAttribute("userId", userId?.toString());
    if (ctx.chat?.id) span?.setAttribute("chatId", ctx.chat.id);

    try {
      if (ctx.session.chatToJoin) {
        const chat = ctx.session.chatToJoin;
        const telegramUsername = ctx.from?.username;
        const proofUrl = await generateProofUrl(
          userId,
          chat.telegramChatID,
          chat.ticketEventIds,
          chat.eventNames,
          telegramUsername
        );

        if (chat.isChatMember) {
          const invite = await ctx.api.createChatInviteLink(
            chat.telegramChatID,
            {
              creates_join_request: true
            }
          );
          range.url(`Go to ${chat.chat?.title}`, invite.invite_link).row();
        } else {
          range.webApp(`Join ${chat.chat?.title}`, proofUrl).row();
        }
        if (!ctx.session.directLinkMode) {
          range.text(`↰  Back`, async (ctx) => {
            ctx.session.chatToJoin = undefined;
            ctx.menu.update();
          });
        }
      } else {
        const chatsWithMembership = await sqlTransaction(
          ctx.session.dbPool,
          (client) => getChatsWithMembershipStatus(client, ctx, userId)
        );

        if (chatsWithMembership.length === 0) {
          range.text(`No groups to join at this time`);
          return;
        }

        for (const chat of chatsWithMembership) {
          if (chat.isChatMember) {
            const invite = await ctx.api.createChatInviteLink(
              chat.telegramChatID,
              {
                creates_join_request: true
              }
            );
            range.url(`✅ ${chat.chat?.title}`, invite.invite_link).row();
            range.row();
          } else {
            range
              .text(` ${chat.chat?.title}`, async (ctx) => {
                ctx.session.chatToJoin = chat;
                ctx.menu.update();
              })
              .row();
          }

          range.row();
        }
      }
    } catch (error) {
      range.text(`Action failed ${error}`);
      return;
    }
  });
};

export const chatsToPostIn = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
  return traced("telegram", "chatsToPostIn", async (span) => {
    const db = ctx.session.dbPool;
    if (!db) {
      range.text(`Database not connected. Try again...`);
      return;
    }
    const userId = ctx.from?.id;
    if (!userId) {
      range.text(`User not found. Try again...`);
      return;
    }
    span?.setAttribute("userId", userId?.toString());
    if (ctx.chat?.id) span?.setAttribute("chatId", ctx.chat.id);

    try {
      // If a chat has been selected, give the user a choice of topics to send to.
      if (ctx.session.selectedChat) {
        const chat = ctx.session.selectedChat;

        // Fetch anon topics for the selected chat
        const { topics, telegramEvents } = await sqlTransaction(
          ctx.session.dbPool,
          async (client) => {
            const topics = await fetchTelegramAnonTopicsByChatId(
              client,
              chat.id
            );

            // Fetch telegram event Ids for the selected chat.
            const telegramEvents = await fetchTelegramEventsByChatId(
              client,
              chat.id
            );

            return { topics, telegramEvents };
          }
        );

        const validEventIds = telegramEvents.map((e) => e.ticket_event_id);

        if (topics.length === 0) {
          range
            .text(`↰  No topics found`, async (ctx) => {
              ctx.session.selectedChat = undefined;
              await ctx.menu.update({ immediate: true });
            })
            .row();
        } else {
          range
            .text(`↰  ${chat.title} Topics`, async (ctx) => {
              ctx.session.selectedChat = undefined;
              await ctx.menu.update({ immediate: true });
            })
            .row();
          for (const topic of topics) {
            if (topic.topic_id) {
              const encodedTopicData = encodeTopicData({
                type: PayloadType.AnonTopicDataPayload,
                value: {
                  chatId: chat.id,
                  topicName: topic.topic_name,
                  topicId: parseInt(topic.topic_id),
                  validEventIds
                }
              });
              range
                .webApp(
                  `${topic.topic_name}`,
                  `${process.env.TELEGRAM_ANON_WEBSITE}?tgWebAppStartParam=${encodedTopicData}`
                )
                .row();
            } else {
              throw new Error(
                `Cannot anon send to a topic ${topic.topic_name} but no id`
              );
            }
          }
        }
      }
      // Otherwise, give the user a list of chats that they are members of.
      else {
        // Only show chats a user is in
        const chatsWithMembership = await sqlTransaction(
          ctx.session.dbPool,
          async (client) =>
            (await getChatsWithMembershipStatus(client, ctx, userId)).filter(
              (c) => c.isChatMember
            )
        );

        if (chatsWithMembership.length > 0) {
          for (const chat of chatsWithMembership) {
            // Only show the chats the user is a member of
            if (chat.isChatMember) {
              range
                .text(`✅ ${chat.chat?.title}`, async (ctx) => {
                  ctx.session.selectedChat = chat.chat;
                  await ctx.menu.update({ immediate: true });
                })
                .row();
            }
          }
        } else {
          if (ctx.session.anonBotExists) {
            await ctx.reply(
              `No chats found to post in. Click here to join one: ${ctx.session.authBotURL}?start=auth`
            );
          } else {
            await ctx.reply(
              `No chats found to post in. Type /start to join one!`
            );
          }
        }
      }
    } catch (error) {
      range.text(`Action failed ${error}`);
      return;
    }
  });
};

const getCurrentTopic = async (
  client: PoolClient,
  ctx: BotContext,
  chatId: number
): Promise<{
  topic: TelegramTopicFetch;
  messageThreadId: number | undefined;
}> => {
  const message = ctx.update.message || ctx.update.callback_query?.message;

  const topic = await fetchTelegramTopic(
    client,
    chatId,
    message?.message_thread_id
  );

  if (!topic) {
    throw new Error(
      `Topic not found to forward from. Edit the topic name and try again!`
    );
  }

  return { topic, messageThreadId: message?.message_thread_id };
};

export const chatsToForwardTo = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
  return traced("telegram", "chatsToForwardTo", async (span) => {
    const db = ctx.session.dbPool;
    if (!db) {
      range.text(`Database not connected. Try again...`);
      return;
    }

    await namedSqlTransaction(db, "chatsToForwardTo", async (client) => {
      const userId = ctx.from?.id;
      if (!userId) {
        range.text(`User not found. Try again...`);
        return;
      }
      const chatId = ctx.chat?.id;
      if (!chatId) {
        range.text(`Chat not found. Try again...`);
        return;
      }

      span?.setAttribute("userId", userId.toString());
      span?.setAttribute("chatId", ctx.chat.id);

      try {
        // If a topic has been selected, confirm forwarding to this topic.
        if (ctx.session.topicToForwardTo) {
          const topicToForwardTo = ctx.session.topicToForwardTo;
          const { topic, messageThreadId } = await getCurrentTopic(
            client,
            ctx,
            chatId
          );
          range
            .text(
              `↰  ${topicToForwardTo.chat?.title} - ${topicToForwardTo.topic_name}`,
              async (ctx) => {
                if (!(await senderIsAdmin(ctx))) return;
                ctx.session.topicToForwardTo = undefined;
                ctx.menu.update();
              }
            )
            .row();
          // If sender_chat_topic_id exists, this topic is already linked to the forwarding topic
          if (topicToForwardTo.sender_chat_topic_id) {
            range.text(`Stop Forwarding`, async (ctx) => {
              if (
                topicToForwardTo.sender_chat_topic_id &&
                topicToForwardTo.receiver_chat_topic_id
              ) {
                await deleteTelegramForward(
                  client,
                  topicToForwardTo.receiver_chat_topic_id,
                  topicToForwardTo.sender_chat_topic_id
                );
                await ctx.reply(`${topic.topic_name} is no longer forwarding`, {
                  reply_to_message_id: messageThreadId
                });
                ctx.session.topicToForwardTo = undefined;
                ctx.menu.update();
              } else {
                ctx.reply(`Can't delete this topic`, {
                  reply_to_message_id: messageThreadId
                });
              }
            });
          } else {
            range.text(`Forward Messages`, async (ctx) => {
              if (!(await senderIsAdmin(ctx))) return;

              // Add event to telegramForwarding table
              await insertTelegramForward(
                client,
                topic.id,
                topicToForwardTo.id
              );
              logger(
                `[TELEGRAM] set ${topic.topic_name} to forward to ${topicToForwardTo.topic_name}`
              );
              ctx.reply(
                `Set <b>${topicToForwardTo.chat?.title}</b> - <i>${topicToForwardTo.topic_name}</i> to receive messages from this topic`,
                {
                  message_thread_id: messageThreadId,
                  parse_mode: "HTML"
                }
              );
              ctx.session.topicToForwardTo = undefined;
              ctx.menu.update();
            });
          }
        }
        // Otherwise, give the user a list of topics that are receiving messages.
        else {
          const { topic, messageThreadId } = await getCurrentTopic(
            client,
            ctx,
            chatId
          );

          const topicsReceving = await fetchTelegramTopicsReceiving(client);
          const finalTopics = reduceFwdList(
            topic.id,
            topicsReceving.filter((t) => t.id !== topic.id)
          );
          const topicsWithChats = await chatIDsToChats(ctx, finalTopics);

          if (topicsWithChats.length === 0) {
            ctx.reply(`No chats are open to receiving`, {
              message_thread_id: messageThreadId
            });
            return;
          }

          for (const topic of topicsWithChats) {
            range
              .text(
                `${topic.sender_chat_topic_id ? "✅" : ""} ${topic.chat
                  ?.title} - ${topic.topic_name}`,
                async (ctx) => {
                  if (!(await senderIsAdmin(ctx))) return;
                  ctx.session.topicToForwardTo = topic;
                  ctx.menu.update();
                }
              )
              .row();
          }
        }
      } catch (error) {
        const message =
          ctx.update.message || ctx.update.callback_query?.message;

        ctx.reply(`Action failed ${error}`, {
          reply_to_message_id: message?.message_thread_id
        });
      }
    });
  });
};

export const helpResponse = async (ctx: BotContext): Promise<void> => {
  if (isDirectMessage(ctx)) {
    await ctx.reply(`Type \`/\` to see a list of commands.`);
  }
};

export const uwuResponse = async (ctx: BotContext): Promise<void> => {
  if (isDirectMessage(ctx)) {
    await ctx.reply(
      `I don't know that command uwu.\n\nType \`/\` to see a list of commands or email ${ZUPASS_SUPPORT_EMAIL}`
    );
  }
};

export const ratResponse = async (ctx: BotContext): Promise<void> => {
  if (isDirectMessage(ctx)) {
    await ctx.reply(
      `I don't know that command 🐭.\n\nType \`/\` to see a list of commands or email ${ZUPASS_SUPPORT_EMAIL}`
    );
  }
};

export function msToTimeString(duration: number): string {
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const seconds = Math.floor((duration / 1000) % 60);

  return `${hours} hours, ${minutes} minutes, and ${seconds} seconds`;
}

const reduceFwdList = (
  senderId: number,
  topics: TelegramTopicWithFwdInfo[]
): TelegramTopicWithFwdInfo[] => {
  const reducedList = topics.reduce((acc: TelegramTopicWithFwdInfo[], curr) => {
    // Check if the receiver already exists in the accumulator
    const existing = acc.find(
      (item) => item.receiver_chat_topic_id === curr.receiver_chat_topic_id
    );

    // If it exists and the current sender is the desired value, replace the existing item
    if (existing && curr.sender_chat_topic_id === senderId) {
      const index = acc.indexOf(existing);
      acc[index] = curr;
    }
    // If it doesn't exist, add the current item to the accumulator
    else if (!existing) {
      acc.push(curr);
    }

    return acc;
  }, []);

  return reducedList;
};

export const encodePayload = (data: AnonWebAppPayload): string => {
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
};

export const buildReactPayload = (
  emoji: string,
  anonMessageId: string
): ReactDataPayload => {
  return {
    type: PayloadType.ReactData,
    react: encodeURIComponent(emoji),
    anonMessageId
  };
};

export function getDisplayEmojis(messageTimestamp?: Date): string[] {
  const frogCryptoDeployTimestamp = new Date(
    "Wed Nov 08 2023 16:30:00 GMT+0300 (GMT+03:00)"
  );

  const downvoteDeployTimestamp = new Date(
    "Sun Nov 19 2023 23:00:00 GMT+0300 (GMT+03:00)"
  );

  if (
    messageTimestamp &&
    messageTimestamp.getTime() < frogCryptoDeployTimestamp.getTime()
  ) {
    return ["👍", "❤️", "🦔"];
  } else if (
    messageTimestamp &&
    messageTimestamp.getTime() < downvoteDeployTimestamp.getTime()
  ) {
    return ["👍", "❤️", "🐸"];
  } else {
    return ["👍", "👎️", "🐸"];
  }
}
