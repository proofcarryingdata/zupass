import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a Telegram conversation into the database.
 */
export async function insertTelegramVerification(
  client: Pool,
  telegramUserId: number,
  telegramChatId: number
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_bot_conversations (telegram_user_id, telegram_chat_id, verified)
values ($1, $2, true)
on conflict do nothing;`,
    [telegramUserId, telegramChatId]
  );
  return result.rowCount;
}
