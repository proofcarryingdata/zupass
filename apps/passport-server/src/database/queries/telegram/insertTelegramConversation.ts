import { Pool } from "postgres-pool";
import { TelegramConversation } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a zuzalu pretix ticket into the database, if they have not been
 * inserted yet. This does not insert an identity commitment for them.
 */
export async function insertTelegramConversation(
  client: Pool,
  params: TelegramConversation
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_bot_conversations (telegram_user_id, telegram_chat_id)
values ($1, $2)
on conflict do nothing;`,
    [params.telegram_user_id, params.telegram_chat_id]
  );
  return result.rowCount;
}
