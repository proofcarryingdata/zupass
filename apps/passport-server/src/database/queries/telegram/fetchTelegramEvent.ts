import { Pool } from "postgres-pool";
import { TelegramAnonChannel, TelegramEvent } from "../../models";
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

export async function fetchTelegramAnonTopicsByChatId(
  client: Pool,
  telegramChatId: number
): Promise<TelegramAnonChannel[]> {
  const result = await sqlQuery(
    client,
    `\
    select a.anon_topic_id, a.anon_topic_name, a.ticket_event_id, t.telegram_chat_id 
    from telegram_chat_anon_topics a
    join telegram_bot_events t on a.ticket_event_id = t.ticket_event_id
    where t.telegram_chat_id = $1
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
    FROM devconnect_pretix_events_info dpe 
    LEFT JOIN telegram_bot_events tbe ON dpe.pretix_events_config_id = tbe.ticket_event_id
    `
  );

  return result.rows;
}

export interface ChatIDWithEventIDs {
  telegramChatID: string;
  ticketEventIds: string[];
}

export async function fetchEventsPerChat(
  client: Pool,
  eventId: string
): Promise<ChatIDWithEventIDs[]> {
  const result = await sqlQuery(
    client,
    `SELECT 
      telegram_chat_id AS "telegramChatID",
      ARRAY_AGG(ticket_event_id) AS "ticketEventIds"
      FROM 
        telegram_bot_events
      GROUP BY 
        telegram_chat_id;`,
    [eventId]
  );
  return result.rows;
}

export async function fetchTelegramAnonTopicsByEventId(
  client: Pool,
  eventId: string
): Promise<TelegramAnonChannel[]> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_chat_anon_topics
    where ticket_event_id = $1
    `,
    [eventId]
  );
  return result.rows;
}
