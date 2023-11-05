import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a Telegram conversation into the database.
 */
export async function insertTelegramVerification(
  client: Pool,
  telegramUserId: number,
  telegramChatId: number,
  semaphoreId: string,
  telegramUsername?: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
    insert into telegram_bot_conversations (telegram_user_id, telegram_chat_id, verified, semaphore_id, telegram_username)
    values ($1, $2, true, $3, $4);
    `,
    [telegramUserId, telegramChatId, semaphoreId, telegramUsername]
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
    on conflict (telegram_chat_id) do nothing`,
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
on conflict (ticket_event_id, telegram_chat_id) do nothing;`,
    [ticketEventId, telegramChatId]
  );
  return result.rowCount;
}

export async function insertTelegramTopic(
  client: Pool,
  telegramChatId: string | number,
  topicName: string,
  topicId?: string | number | null,
  isAnon?: boolean
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_chat_topics (telegram_chat_id, topic_id, topic_name, is_anon_topic)
values ($1, $2, $3, $4)
on conflict (telegram_chat_id, topic_id) do update 
set topic_name = $3, is_anon_topic = $4;`,
    [telegramChatId, topicId || null, topicName, isAnon || false]
  );
  return result.rowCount;
}

export async function insertOrUpdateTelegramNullifier(
  client: Pool,
  nullifierHash: string,
  messageTimestamps: string[],
  chatTopicId: number
): Promise<void> {
  const query = `
    insert into telegram_chat_anon_nullifiers (nullifier, message_timestamps, chat_topic_id)
    values ($1, $2, $3)
    on conflict (nullifier, chat_topic_id) do update
      set message_timestamps = $2
  `;

  await sqlQuery(client, query, [
    nullifierHash,
    messageTimestamps,
    chatTopicId
  ]);
}

export async function updateTelegramUsername(
  client: Pool,
  telegramUserId: string,
  telegramUsername: string
): Promise<void> {
  await sqlQuery(
    client,
    `\
    update telegram_bot_conversations set telegram_username = $1
    where telegram_user_id = $2
    `,
    [telegramUsername, telegramUserId]
  );
}

export async function insertTelegramForward(
  client: Pool,
  senderChatTopicID: number | null,
  receiverChatTopicID: number | null
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_forwarding (sender_chat_topic_id, receiver_chat_topic_id)
values ($1, $2)
on conflict (sender_chat_topic_id, receiver_chat_topic_id) do nothing`,
    [senderChatTopicID, receiverChatTopicID]
  );
  return result.rowCount;
}

export async function insertTelegramAnonMessage(
  client: Pool,
  nullifierHash: string,
  chatTopicId: number,
  message: string,
  proof: string,
  timestamp: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
    insert into telegram_chat_anon_messages (nullifier, chat_topic_id, content, proof, message_timestamp)
    values ($1, $2, $3, $4, $5)
    `,
    [nullifierHash, chatTopicId, message, proof, timestamp]
  );
  return result.rowCount;
}
