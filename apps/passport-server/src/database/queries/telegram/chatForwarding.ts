import { Pool } from "postgres-pool";
import { ChatForwarding, ChatReceiving } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function insertIntoChatsReceiving(
  client: Pool,
  chatId: number,
  topicId: number | undefined,
  topicName: string | undefined
): Promise<void> {
  await sqlQuery(
    client,
    `\
    INSERT INTO chats_receiving (chat_id, topic_id, topic_name)
    VALUES ($1, $2, $3)
    `,
    [chatId, topicId, topicName]
  );
}

export async function fetchFromChatsReceiving(
  client: Pool,
  chatId: number,
  topicId?: number
): Promise<ChatReceiving[]> {
  let query = `SELECT chat_id as "telegramChatID", * FROM chats_receiving WHERE chat_id = $1`;
  const values = [chatId];

  if (topicId !== undefined) {
    query += ` AND topic_id = $2`;
    values.push(topicId);
  }

  const result = await sqlQuery(client, query, values);
  return result.rows;
}

export async function fetchChatsReceiving(
  client: Pool
): Promise<ChatReceiving[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT chat_id as "telegramChatID", * FROM chats_receiving
    `
  );

  return result.rows;
}

export async function fetchFromChatsReceivingById(
  client: Pool,
  id: number
): Promise<ChatReceiving> {
  const result = await sqlQuery(
    client,
    `\
    SELECT chat_id as "telegramChatID", * FROM chats_receiving
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

export async function insertIntoChatsForwarding(
  client: Pool,
  chatId: string,
  chatReceivingId: number,
  topicId: number | undefined
): Promise<void> {
  await sqlQuery(
    client,
    `\
    INSERT INTO chats_forwarding (chat_id, topic_id, chat_receiving_id)
    VALUES ($1, $2, $3)
    `,
    [chatId, topicId, chatReceivingId]
  );
}

export async function fetchFromChatsForwarding(
  client: Pool,
  chatId: number,
  topicId?: number
): Promise<ChatForwarding | null> {
  const result = await sqlQuery(
    client,
    `\
    SELECT chat_id as "telegramChatID", * FROM chats_forwarding
    WHERE chat_id = $1 and topic_id = $2
    `,
    [chatId, topicId]
  );

  return result.rows[0] || null;
}
