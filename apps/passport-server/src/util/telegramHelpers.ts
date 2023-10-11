import { MenuRange } from "@grammyjs/menu";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { Context, SessionFlavor } from "grammy";
import { Chat, ChatMemberAdministrator, ChatMemberOwner } from "grammy/types";
import { Pool } from "postgres-pool";
import { deleteTelegramEvent } from "../database/queries/telegram/deleteTelegramEvent";
import {
  ChatIDWithEventIDs,
  LinkedPretixTelegramEvent,
  fetchEventsPerChat,
  fetchLinkedPretixAndTelegramEvents,
  fetchTelegramAnonTopicsByChatId,
  fetchTelegramEventsByChatId,
  fetchUserTelegramChats
} from "../database/queries/telegram/fetchTelegramEvent";
import {
  insertTelegramChat,
  insertTelegramEvent
} from "../database/queries/telegram/insertTelegramConversation";
import { logger } from "./logger";

export type TopicChat = Chat.GroupChat | Chat.SupergroupChat | null;

type ChatIDWithChat<T extends LinkedPretixTelegramEvent | ChatIDWithEventIDs> =
  T & {
    chat: TopicChat;
  };

export interface SessionData {
  dbPool: Pool;
  selectedEvent?: LinkedPretixTelegramEvent & { isLinked: boolean };
  lastMessageId?: number;
  selectedChat?: TopicChat;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export const base64EncodeTopicData = (
  topicName: string,
  topicId: number | string,
  validEventIds: string[]
): string => {
  const topicData = Buffer.from(
    encodeURIComponent(
      JSON.stringify({
        topicName: topicName,
        topicId,
        validEventIds
      })
    ),
    "utf-8"
  );
  const encodedTopicData = topicData.toString("base64");
  if (encodedTopicData.length > 512)
    throw new Error("Topic data too big for telegram startApp parameter");

  return encodedTopicData;
};

function isFulfilled<T>(
  promiseSettledResult: PromiseSettledResult<T>
): promiseSettledResult is PromiseFulfilledResult<T> {
  return promiseSettledResult.status === "fulfilled";
}

/**
 * Fetches the chat object for a list contaning a telegram chat id
 */
export const chatIDsToChats = async <
  T extends LinkedPretixTelegramEvent | ChatIDWithEventIDs
>(
  db: Pool,
  ctx: BotContext,
  chats: T[]
): Promise<ChatIDWithChat<T>[]> => {
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
};

export const findChatByEventIds = (
  chats: ChatIDWithEventIDs[],
  eventIds: string[]
): string | null => {
  if (eventIds.length === 0) return null;
  for (const chat of chats) {
    if (eventIds.every((eventId) => chat.ticketEventIds.includes(eventId))) {
      return chat.telegramChatID;
    }
  }
  return null;
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

export const isGroupWithTopics = (ctx: Context): boolean => {
  return !!(ctx.chat?.type && ctx.chat?.type === "supergroup");
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

const generateProofUrl = (
  telegramUserId: string,
  validEventIds: string[]
): string => {
  const fieldsToReveal: EdDSATicketFieldsToReveal = {
    revealTicketId: false,
    revealEventId: true,
    revealProductId: true,
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
  const returnUrl = `${process.env.PASSPORT_SERVER_URL}/telegram/verify/${telegramUserId}`;

  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(passportOrigin, returnUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "",
    description:
      "Zucat would like to invite you to a Telegram group and requested a zero-knowledge proof."
  });
  return proofUrl;
};

export const dynamicEvents = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
  const db = ctx.session.dbPool;
  if (!db) {
    range.text(`Database not connected. Try again...`);
    return;
  }
  // If an event is selected, display it and its menu options
  if (ctx.session.selectedEvent) {
    const event = ctx.session.selectedEvent;

    range.text(`${event.isLinked ? "✅" : ""} ${event.eventName}`).row();
    range
      .text(`Yes, ${event.isLinked ? "remove" : "add"}`, async (ctx) => {
        let replyText = "";
        if (!(await senderIsAdmin(ctx))) return;

        if (!ctx.chat?.id) {
          await editOrSendMessage(ctx, `Chat Id not found`);
        } else {
          if (!event.isLinked) {
            replyText = `<i>Added ${event.eventName} from chat</i>`;
            await insertTelegramChat(db, ctx.chat.id);
            await insertTelegramEvent(db, event.configEventID, ctx.chat.id);
            await editOrSendMessage(ctx, replyText);
          } else {
            replyText = `<i>Removed ${event.eventName} to chat</i>`;
            await deleteTelegramEvent(db, event.configEventID);
          }
        }
        ctx.session.selectedEvent = undefined;
        await ctx.menu.update({ immediate: true });
        await editOrSendMessage(ctx, replyText);
      })
      .row();

    range.text(`Go back`, async (ctx) => {
      if (!(await senderIsAdmin(ctx))) return;
      checkDeleteMessage(ctx);
      ctx.session.selectedEvent = undefined;
      await ctx.menu.update({ immediate: true });
    });
  }
  // Otherwise, display all events to manage.
  else {
    const events = await fetchLinkedPretixAndTelegramEvents(db);
    const eventsWithGateStatus = events.map((e) => {
      return { ...e, isLinked: e.telegramChatID === ctx.chat?.id.toString() };
    });
    for (const event of eventsWithGateStatus) {
      range
        .text(
          `${event.isLinked ? "✅" : ""} ${event.eventName}`,
          async (ctx) => {
            if (!(await senderIsAdmin(ctx))) return;
            if (ctx.session) {
              ctx.session.selectedEvent = event;
              await ctx.menu.update({ immediate: true });
              let initText = "";
              if (event.isLinked) {
                initText = `<i>Users with tickets for ${ctx.session.selectedEvent.eventName} will NOT be able to join this chat</i>`;
              } else {
                initText = `<i>Users with tickets for ${ctx.session.selectedEvent.eventName} will be able to join this chat</i>`;
              }
              await editOrSendMessage(ctx, initText);
            } else {
              ctx.reply(`No session found`);
            }
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

  const events = await fetchEventsPerChat(db);
  const eventsWithChats = await chatIDsToChats(db, ctx, events);
  const userChats = await fetchUserTelegramChats(db, userId);

  const finalEvents = eventsWithChats.map((e) => {
    return {
      ...e,
      userIsChatMember: userChats
        ? userChats.telegramChatIDs.includes(e.telegramChatID)
        : false
    };
  });
  if (finalEvents && finalEvents.length === 0) {
    range.text(`No groups to join at this time`);
    return;
  }
  const sortedChats = finalEvents.sort(
    (a, b) => +a.userIsChatMember - +b.userIsChatMember
  );
  for (const chat of sortedChats) {
    if (chat.userIsChatMember) {
      const invite = await ctx.api.createChatInviteLink(chat.telegramChatID, {
        creates_join_request: true
      });
      range.url(`✅ ${chat.chat?.title}`, invite.invite_link).row();
      range.row();
    } else {
      const proofUrl = generateProofUrl(userId.toString(), chat.ticketEventIds);
      range.webApp(`${chat.chat?.title}`, proofUrl).row();
    }
  }
};

export const chatsToPostIn = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
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
  try {
    if (ctx.session.selectedChat) {
      const chat = ctx.session.selectedChat;
      const topics = await fetchTelegramAnonTopicsByChatId(
        ctx.session.dbPool,
        chat.id
      );
      const telegramEvents = await fetchTelegramEventsByChatId(
        ctx.session.dbPool,
        chat.id
      );
      const validEventIds = telegramEvents.map((e) => e.ticket_event_id);

      if (topics.length === 0) {
        range.text(`No topics found`).row();
      } else {
        range
          .text(`${chat.title} Topics`)

          .row();
        for (const topic of topics) {
          const encodedTopicData = base64EncodeTopicData(
            topic.topic_name,
            topic.topic_id,
            validEventIds
          );
          range
            .webApp(
              `${topic.topic_name}`,
              `${process.env.TELEGRAM_ANON_WEBSITE}?tgWebAppStartParam=${encodedTopicData}`
            )
            .row();
        }
      }
      range.text(`↰  Back`, async (ctx) => {
        ctx.session.selectedChat = undefined;
        await ctx.menu.update({ immediate: true });
      });
    } else {
      const events = await fetchEventsPerChat(db);
      const eventsWithChats = await chatIDsToChats(db, ctx, events);
      if (eventsWithChats && eventsWithChats.length === 0) {
        range.text(`No groups to join at this time`);
        return;
      }
      const userChats = await fetchUserTelegramChats(db, userId);

      const finalChats = eventsWithChats.filter(
        (e) => userChats && userChats.telegramChatIDs.includes(e.telegramChatID)
      );
      if (finalChats?.length > 0) {
        for (const chat of finalChats) {
          range
            .text(`✅ ${chat.chat?.title}`, async (ctx) => {
              ctx.session.selectedChat = chat.chat;
              await ctx.menu.update({ immediate: true });
            })
            .row();
        }
      } else {
        ctx.reply(`No chats found to post in. Type /start to join one!`);
      }
    }
  } catch (error) {
    range.text(`Action failed ${error}`);
    return;
  }
};
