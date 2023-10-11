import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete an event <> telegram chat entry.
 */
export async function deleteTelegramEvent(
  client: Pool,
  ticketEventId: string
): Promise<void> {
  await sqlQuery(
    client,
    `\
    delete from telegram_bot_events
    where ticket_event_id = $1
    `,
    [ticketEventId]
  );
}

export async function deleteTelegramChat(
  client: Pool,
  telegramChatId: number
): Promise<void> {
  await sqlQuery(
    client,
    `\
    delete from telegram_chats
    where telegram_chat_id = $1
    `,
    [telegramChatId]
  );
}

export async function deleteTelegramChatTopic(
  client: Pool,
  telegramChatId: number,
  telegramTopicId: number
): Promise<void> {
  await sqlQuery(
    client,
    `\
    delete from telegram_chat_topics
    where telegram_chat_id = $1 and topic_id = $2
    `,
    [telegramChatId, telegramTopicId]
  );
}
