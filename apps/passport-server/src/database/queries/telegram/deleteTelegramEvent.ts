import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete an event <> telegram chat entry.
 */
export async function deleteTelegramEvent(
  client: Pool,
  ticketEventId: string
): Promise<void> {
  await sqlQuery(
    client,
    `\
    delete from telegram_bot_events
    where ticket_event_id = $1
    `,
    [ticketEventId]
  );
}
