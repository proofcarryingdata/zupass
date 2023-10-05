import { MenuRange } from "@grammyjs/menu";
import { Context, SessionFlavor } from "grammy";
import { Chat, ChatMemberAdministrator, ChatMemberOwner } from "grammy/types";
import { Pool } from "postgres-pool";
import { deleteTelegramEvent } from "../database/queries/telegram/deleteTelegramEvent";
import {
  ChatIDWithEvents,
  LinkedPretixTelegramEvent,
  fetchEventsPerChat,
  fetchLinkedPretixAndTelegramEvents
} from "../database/queries/telegram/fetchTelegramEvent";
import { insertTelegramEvent } from "../database/queries/telegram/insertTelegramConversation";
import { logger } from "./logger";

export interface SessionData {
  dbPool: Pool;
  selectedEvent?: LinkedPretixTelegramEvent & { isLinked: boolean };
  lastMessageId?: number;
  selectedChat?: EventWithChat;
}

export interface EventWithChat {
  chat: Chat.GroupChat | Chat.SupergroupChat | null;
  telegramChatID: string | null;
  eventName: string;
  configEventID: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

/**
 * Fetches the chat object for a list contaning a telegram chat id
 */
export const getEventsWithChats = async (
  db: Pool,
  ctx: BotContext,
  chats: LinkedPretixTelegramEvent[] | ChatIDWithEvents[]
): Promise<EventWithChat[]> => {
  const eventsWithChatsRequests = chats.map(async (e) => {
    return {
      ...e,
      chat: e.telegramChatID ? await ctx.api.getChat(e.telegramChatID) : null
    };
  });
  const eventsWithChatsSettled = await Promise.allSettled(
    eventsWithChatsRequests
  );

  const eventsWithChats = eventsWithChatsSettled
    .filter(
      (e): e is PromiseFulfilledResult<EventWithChat> =>
        e.status === "fulfilled"
    )
    .map((e) => e.value);

  return eventsWithChats;
};

export const findChatByEventIds = (
  chats: ChatIDWithEvents[],
  eventIds: string[]
): string | null => {
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

export const userEvents = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
  const db = ctx.session.dbPool;
  if (!db) {
    range.text(`Database not connected. Try again...`);
    return;
  }
  // // If an event is selected, display it and its menu options
  if (ctx.session?.selectedChat) {
    const chat = ctx.session?.selectedChat;

    range.text(`${chat.chat?.title}`).row();
    range.webApp(`Join`, "https://google.com").row();

    range.text(`Go back`, async (ctx) => {
      // checkDeleteMessage(ctx);
      ctx.session.selectedChat = undefined;
      await ctx.menu.update({ immediate: true });
    });
  }
  // Otherwise, display all events to manage.
  else {
    const events = await fetchEventsPerChat(db);
    const eventsWithChats = await getEventsWithChats(db, ctx, events);
    for (const chat of eventsWithChats) {
      range
        .text(`${chat.chat?.title}`, async (ctx) => {
          ctx.session.selectedChat = chat;
          // if (ctx.session) {
          //   ctx.session.selectedEvent = event;
          //   await ctx.menu.update({ immediate: true });
          //   let initText = "";
          //   if (event.isLinked) {
          //     initText = `<i>Users with tickets for ${ctx.session.selectedEvent.eventName} will NOT be able to join this chat</i>`;
          //   } else {
          //     initText = `<i>Users with tickets for ${ctx.session.selectedEvent.eventName} will be able to join this chat</i>`;
          //   }
          //   await editOrSendMessage(ctx, initText);
          // } else {
          //   ctx.reply(`No session found`);
          // }
        })
        .row();
    }
  }
};
