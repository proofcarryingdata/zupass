import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a Telegram conversation into the database.
 */
export async function insertTelegramVerification(
  client: Pool,
  telegramUserId: number,
  telegramChatId: number,
  semaphoreId: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_bot_conversations (telegram_user_id, telegram_chat_id, verified, semaphore_id)
values ($1, $2, true, $3);`,
    [telegramUserId, telegramChatId, semaphoreId]
  );
  return result.rowCount;
}

export async function insertTelegramChat(
  client: Pool,
  telegramChatId: number
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
    insert into telegram_chats(telegram_chat_id)
    values ($1)
    on conflict (telegram_chat_id) do update 
    set telegram_chat_id = $1`,
    [telegramChatId]
  );
  return result.rowCount;
}

export async function insertTelegramEvent(
  client: Pool,
  ticketEventId: string,
  telegramChatId: number
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_bot_events (ticket_event_id, telegram_chat_id)
values ($1, $2)
on conflict (ticket_event_id) do update
set telegram_chat_id = $2;`,
    [ticketEventId, telegramChatId]
  );
  return result.rowCount;
}

export async function insertTelegramTopic(
  client: Pool,
  telegramChatId: number,
  topicId: number,
  topicName: string,
  isAnon: boolean
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_chat_topics (telegram_chat_id, topic_id, topic_name, is_anon_topic)
values ($1, $2, $3, $4)
on conflict (telegram_chat_id, topic_id) do update 
set topic_name = $3, is_anon_topic = $4;`,
    [telegramChatId, topicId, topicName, isAnon]
  );
  return result.rowCount;
}

export async function insertOrUpdateTelegramNullifier(
  client: Pool,
  nullifierHash: string,
  messageTimestamps: string[]
): Promise<void> {
  const query = `
    insert into telegram_chat_anon_nullifiers (nullifier, message_timestamps)
    values ($1, $2)
    on conflict (nullifier) do update
      set message_timestamps = $2
  `;

  await sqlQuery(client, query, [nullifierHash, messageTimestamps]);
}
