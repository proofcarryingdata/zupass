import { Pool } from "postgres-pool";
import { TelegramConversation } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch the list of Telegram conversations for a user from the database.
 */
export async function fetchTelegramConversation(
  client: Pool,
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

/**
 *
 */
export async function fetchTelegramVerificationStatus(
  client: Pool,
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
