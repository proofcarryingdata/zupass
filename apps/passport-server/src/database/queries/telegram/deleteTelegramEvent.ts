import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete an event <> telegram chat entry.
 */
export async function deleteTelegramEvent(
  client: PoolClient,
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
  client: PoolClient,
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
  client: PoolClient,
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

export async function deleteTelegramForward(
  client: PoolClient,
  receiverChatTopicID: number,
  senderChatTopicID: number | null
): Promise<void> {
  let queryString =
    "DELETE FROM telegram_forwarding WHERE receiver_chat_topic_id = $1";
  const queryParams = [receiverChatTopicID];

  if (senderChatTopicID !== null) {
    queryString += " AND sender_chat_topic_id = $2";
    queryParams.push(senderChatTopicID);
  }

  await sqlQuery(client, queryString, queryParams);
}
