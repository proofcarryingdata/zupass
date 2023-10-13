import { MenuRange } from "@grammyjs/menu";
import { deleteTelegramEvent } from "../database/queries/telegram/delete";
import {
  fetchLinkedPretixAndTelegramEvents,
  fetchTelegramAnonTopicsByChatId,
  fetchTelegramEventsByChatId
} from "../database/queries/telegram/fetch";
import {
  insertTelegramChat,
  insertTelegramEvent
} from "../database/queries/telegram/insert";
import {
  BotContext,
  base64EncodeTopicData,
  checkDeleteMessage,
  editOrSendMessage,
  generateProofUrl,
  getChatsWithMembershipStatus,
  senderIsAdmin
} from "./telegramUtils";

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
    range.text(`Chat id not found. Try again...`);
    return;
  }

  // If an event is selected, display it and its menu options
  if (ctx.session.selectedEvent) {
    const event = ctx.session.selectedEvent;

    range.text(`${event.isLinkedToChat ? "✅" : ""} ${event.eventName}`).row();
    range
      .text(`Yes, ${event.isLinkedToChat ? "remove" : "add"}`, async (ctx) => {
        let replyText = "";
        if (!(await senderIsAdmin(ctx))) return;

        if (!event.isLinkedToChat) {
          replyText = `<i>Added ${event.eventName} from chat</i>`;
          await insertTelegramChat(db, chatId);
          await insertTelegramEvent(db, event.configEventID, chatId);
          await editOrSendMessage(ctx, replyText);
        } else {
          replyText = `<i>Removed ${event.eventName} to chat</i>`;
          await deleteTelegramEvent(db, event.configEventID);
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
    const events = await fetchLinkedPretixAndTelegramEvents(db, chatId);

    for (const event of events) {
      range
        .text(
          `${event.isLinkedToChat ? "✅" : ""} ${event.eventName}`,
          async (ctx) => {
            if (!(await senderIsAdmin(ctx))) return;
            if (ctx.session) {
              ctx.session.selectedEvent = event;
              await ctx.menu.update({ immediate: true });
              let initText = "";
              if (event.isLinkedToChat) {
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

  const chatsWithMembership = await getChatsWithMembershipStatus(
    db,
    ctx,
    userId
  );

  if (chatsWithMembership.length === 0) {
    range.text(`No chats to join at this time`);
    return;
  }

  for (const chat of chatsWithMembership) {
    if (chat.isChatMember) {
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

      // Fetch anon topics for a specific chat
      const topics = await fetchTelegramAnonTopicsByChatId(
        ctx.session.dbPool,
        chat.id
      );

      // Fetch telegram events associated with the selected chat.
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
            chat.id,
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
      const chatsWithMembership = await getChatsWithMembershipStatus(
        db,
        ctx,
        userId
      );
      if (chatsWithMembership.length === 0) {
        range.text(`No chats found to post in. Type /start to join one!`);
        return;
      }

      for (const chat of chatsWithMembership) {
        range
          .text(`✅ ${chat.chat?.title}`, async (ctx) => {
            ctx.session.selectedChat = chat.chat;
            await ctx.menu.update({ immediate: true });
          })
          .row();
      }
    }
  } catch (error) {
    range.text(`Action failed ${error}`);
    return;
  }
};
