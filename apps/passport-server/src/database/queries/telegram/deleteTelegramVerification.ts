import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete a verification.
 */
export async function deleteTelegramVerification(
  client: PoolClient,
  telegramUserId: number,
  telegramChatId: number
): Promise<void> {
  await sqlQuery(
    client,
    `\
    delete from telegram_bot_conversations
    where telegram_user_id = $1
    and telegram_chat_id = $2 
    `,
    [telegramUserId, telegramChatId]
  );
}
