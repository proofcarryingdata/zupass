import { Pool } from "postgres-pool";
import { ChatsForwarding, ChatsReceiving } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function insertIntoChatsReceiving(
  client: Pool,
  chatId: number,
  topicId: number | undefined
): Promise<void> {
  await sqlQuery(
    client,
    `\
    INSERT INTO chats_receiving (chat_id, topic_id)
    VALUES ($1, $2)
    `,
    [chatId, topicId]
  );
}

export async function fetchFromChatsReceivingByChatId(
  client: Pool,
  chatId: number
): Promise<ChatsReceiving[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT * FROM chats_receiving
    WHERE chat_id = $1
    `,
    [chatId]
  );

  return result.rows;
}

export async function insertIntoChatsForwarding(
  client: Pool,
  chatId: number,
  topicId: number | null,
  chatReceivingId: number
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

export async function fetchFromChatsForwardingByChatId(
  client: Pool,
  chatId: number
): Promise<ChatsForwarding[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT * FROM chats_forwarding
    WHERE chat_id = $1
    `,
    [chatId]
  );

  return result.rows;
}
