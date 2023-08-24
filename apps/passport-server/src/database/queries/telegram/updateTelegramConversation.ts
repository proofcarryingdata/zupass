import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Updates a pretix ticket in our database.
 */
export async function markTelegramUserAsVerified(
  client: Pool,
  telegramUserId: number
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
update telegram_bot_conversations
set verified = TRUE
where telegram_user_id=$1;`,
    [telegramUserId]
  );
  return result.rowCount;
}
