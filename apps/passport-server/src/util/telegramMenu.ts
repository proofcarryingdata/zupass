import { MenuRange } from "@grammyjs/menu";
import { Context, SessionFlavor } from "grammy";
import { Pool } from "postgres-pool";
import { deleteTelegramEvent } from "../database/queries/telegram/deleteTelegramEvent";
import {
  LinkedPretixTelegramEvent,
  fetchLinkedPretixAndTelegramEvents
} from "../database/queries/telegram/fetchTelegramEvent";
import { insertTelegramEvent } from "../database/queries/telegram/insertTelegramConversation";

export interface SessionData {
  dbPool: Pool;
  selectedEvent?: LinkedPretixTelegramEvent & { isLinked: boolean };
  lastMessageId?: number;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export const getSessionKey = (ctx: Context): string | undefined => {
  // Give every user their one personal session storage per chat with the bot
  // (an independent session for each group and their private chat)
  return ctx.from === undefined || ctx.chat === undefined
    ? undefined
    : `${ctx.from.id}/${ctx.chat.id}`;
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
  if (ctx.chat?.id && ctx.session.lastMessageId)
    await ctx.api.editMessageText(
      ctx.chat?.id,
      ctx.session.lastMessageId,
      replyText,
      {
        parse_mode: "HTML"
      }
    );
  else {
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
  const events = await fetchLinkedPretixAndTelegramEvents(db);
  const eventsWithGateStatus = events.map((e) => {
    return { ...e, isLinked: e.telegramChatID === ctx.chat?.id.toString() };
  });
  for (const event of eventsWithGateStatus) {
    range
      .text(`${event.isLinked ? "✅" : ""} ${event.eventName}`, async (ctx) => {
        if (ctx.session) {
          ctx.session.selectedEvent = event;
          let initText = "";
          if (event.isLinked) {
            initText = `<i>Users with tickets for ${ctx.session.selectedEvent.eventName} will no longer be able to join this chat</i>`;
          } else {
            initText = `<i>Users with tickets for ${ctx.session.selectedEvent.eventName} can now join this chat</i>`;
          }
          await editOrSendMessage(ctx, initText);
          ctx.menu.nav(`manageEvent`);
        } else {
          ctx.reply(`No session found`);
        }
      })
      .row();
  }
};

export const manageEvent = async (
  ctx: BotContext,
  range: MenuRange<BotContext>
): Promise<void> => {
  const event = ctx?.session?.selectedEvent;
  if (!event) {
    range.text(`No event selected`).row().back(`Go back`);
    return;
  }
  const db = ctx.session.dbPool;
  if (!db) {
    range.text(`Database not connected. Try again...`);
    return;
  }

  range
    .text(`Yes, ${event.isLinked ? "Remove" : "Add"}`, async (ctx) => {
      if (!ctx.chat?.id) {
        await editOrSendMessage(ctx, `Chat Id not found`);
      } else {
        if (!event.isLinked) {
          const replyText = `<i>Added ${event.eventName} to chat</i>`;
          await insertTelegramEvent(db, event.configEventID, ctx.chat.id);
          await editOrSendMessage(ctx, replyText);
        } else {
          const replyText = `<i>Removed ${event.eventName} to chat</i>`;
          await deleteTelegramEvent(db, event.configEventID);
          await editOrSendMessage(ctx, replyText);
        }
      }
      ctx.menu.back();
    })
    .row();

  range.back(`Go back`, (ctx) => {
    checkDeleteMessage(ctx);
  });
};
