import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

export async function fetchTelegramUsernameFromSemaphoreId(
  client: Pool,
  semaphoreId: string
): Promise<string | null> {
  const result = await sqlQuery(
    client,
    `\
    select telegram_username from telegram_bot_conversations
    where semaphore_id = $1
    `,
    [semaphoreId]
  );
  if (result.rowCount === 0) {
    return null;
  }
  const telegramUsername: string = result.rows[0].telegram_username;
  return telegramUsername;
}
