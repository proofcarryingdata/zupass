import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

export async function fetchSemaphoreIdFromTelegramUsername(
  client: PoolClient,
  telegramUsername: string
): Promise<string | null> {
  const result = await sqlQuery(
    client,
    `\
    select semaphore_id from telegram_bot_conversations
    where telegram_username = $1
    `,
    [telegramUsername]
  );
  if (result.rowCount === 0) {
    return null;
  }
  const semaphoreId: string = result.rows[0].semaphore_id;
  return semaphoreId;
}
