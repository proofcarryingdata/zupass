import { Pool } from "postgres-pool";
import { TelegramConversation } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch the list of Pretix organizers from the database.
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
