import { Pool } from "postgres-pool";
import { TelegramEvent } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch the list of Telegram conversations from the database.
 */
export async function fetchTelegramEventByEventId(
  client: Pool,
  eventId: string
): Promise<TelegramEvent> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_bot_events
    where ticket_event_id = $1
    `,
    [eventId]
  );

  return result.rows[0] ?? null;
}

export async function fetchTelegramEventsByChatId(
  client: Pool,
  telegramChatId: number
): Promise<TelegramEvent[]> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_bot_events
    where telegram_chat_id = $1
    `,
    [telegramChatId]
  );

  return result.rows;
}

export interface LinkedPretixTelegramEvent {
  telegramChatID: string | null;
  eventName: string;
  configEventID: string;
}
export async function fetchLinkedPretixAndTelegramEvents(
  client: Pool
): Promise<LinkedPretixTelegramEvent[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT
      tbe.telegram_chat_id AS "telegramChatID",
      dpe.event_name AS "eventName",
      dpe.pretix_events_config_id AS "configEventID" 
    FROM pretix_events_config pec
    LEFT JOIN devconnect_pretix_events_info dpe ON pec.id = dpe.pretix_events_config_id
    LEFT JOIN telegram_bot_events tbe ON dpe.pretix_events_config_id = tbe.ticket_event_id
    `
  );

  return result.rows;
}
