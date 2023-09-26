import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

// for anon chat
export async function insertTelegramNullifier(
  client: Pool,
  semaphoreId: string,
  ticketEventId: string,
  telegramChatId: number,
  maxMessagesPerDay: number
): Promise<boolean> {
  const result = await sqlQuery(
    client,
    `\
    insert into telegram_bot_anon_nullifiers (id, ticket_event_id, telegram_chat_id, nullifier_times_used, last_used_timestamp)
    values ($1, $2, $3, 1, now())
    on conflict (id) 
    do update set
        nullifier_times_used = 
          case 
              when excluded.last_used_timestamp <= now() - interval '24 hours' then 0 
              else telegram_bot_anon_nullifiers.nullifier_times_used + 1
          end,
        last_used_timestamp = now()
    returning nullifier_times_used;`,
    [semaphoreId, ticketEventId, telegramChatId]
  );

  // Check the returned value for nullifier_times_used and determine the status.
  const timesUsed = result.rows[0]?.nullifier_times_used;
  if (typeof timesUsed === "number") {
    return timesUsed < maxMessagesPerDay ? true : false;
  }
  throw new Error("Failed to insert or update nullifier.");
}
