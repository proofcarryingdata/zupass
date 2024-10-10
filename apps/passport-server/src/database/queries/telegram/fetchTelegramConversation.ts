import { PoolClient } from "postgres-pool";
import { AnonNullifierInfo, TelegramConversation } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch the list of Telegram conversations for a user from the database.
 */
export async function fetchTelegramConversation(
  client: PoolClient,
  telegramUserId: number
): Promise<TelegramConversation | null> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_bot_conversations
    where telegram_user_id = $1
    `,
    [telegramUserId]
  );

  return result.rows[0];
}

export async function fetchTelegramConversationsByChatId(
  client: PoolClient,
  telegramChatId: number
): Promise<TelegramConversation[]> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_bot_conversations
    where telegram_chat_id = $1
    `,
    [telegramChatId]
  );

  return result.rows;
}

export async function fetchTelegramVerificationStatus(
  client: PoolClient,
  telegramUserId: number,
  telegramChatId: number
): Promise<boolean> {
  const result = await sqlQuery(
    client,
    `\
    select verified from telegram_bot_conversations
    where telegram_user_id = $1
    and telegram_chat_id = $2 
    `,
    [telegramUserId, telegramChatId]
  );

  return result.rows[0]?.verified ?? false;
}

export async function fetchAnonTopicNullifier(
  client: PoolClient,
  nullifierHash: string,
  chatTopicId: number
): Promise<AnonNullifierInfo | undefined> {
  const result = await sqlQuery(
    client,
    `\
      select * from telegram_chat_anon_nullifiers 
      where nullifier = $1
      and chat_topic_id = $2
    `,
    [nullifierHash, chatTopicId]
  );
  return result.rows[0];
}
