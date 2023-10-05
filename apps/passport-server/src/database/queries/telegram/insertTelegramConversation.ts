import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a Telegram conversation into the database.
 */
export async function insertTelegramVerification(
  client: Pool,
  telegramUserId: number,
  telegramChatId: number,
  semaphoreId: string
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_bot_conversations (telegram_user_id, telegram_chat_id, verified, semaphore_id)
values ($1, $2, true, $3)
on conflict do nothing;`,
    [telegramUserId, telegramChatId, semaphoreId]
  );
  return result.rowCount;
}

export async function insertTelegramEvent(
  client: Pool,
  ticketEventId: string,
  telegramChatId: number,
  anonChatId?: number
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into telegram_bot_events (ticket_event_id, telegram_chat_id, anon_chat_id)
values ($1, $2, $3)
on conflict (ticket_event_id) do update
set telegram_chat_id = $2, anon_chat_id = $3;`,
    [ticketEventId, telegramChatId, anonChatId]
  );
  return result.rowCount;
}
