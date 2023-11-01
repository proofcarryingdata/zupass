import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

export async function fetchTelegramUserIdFromSemaphoreId(
  client: Pool,
  sempahoreId: string
): Promise<string | null> {
  const result = await sqlQuery(
    client,
    `\
    select telegram_user_id from telegram_bot_conversations
    where semaphore_id = $1
    `,
    [sempahoreId]
  );
  if (result.rowCount == 0) {
    return null;
  }
  const telegramUserId: string = result.rows[0].telegram_user_id;
  return telegramUserId;
}
