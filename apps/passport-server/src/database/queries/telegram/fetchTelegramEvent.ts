import { Pool } from "postgres-pool";
import { FALLBACK_EVENT_IDS_TO_EVENT_NAME } from "../../../util/constants";
import { TelegramAnonChannel, TelegramChat, TelegramEvent } from "../../models";
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

export async function fetchTelegramChat(
  client: Pool,
  telegramChatId: number
): Promise<TelegramChat> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_chats
    where telegram_chat_id = $1
    `,
    [telegramChatId]
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
  eventID: string;
}

export async function fetchLinkedTelegramEvents(
  client: Pool
): Promise<LinkedPretixTelegramEvent[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT
      ke.event_id AS "eventID",
      tbe.telegram_chat_id AS "telegramChatID",
      dpe.event_name AS "eventName"
    FROM known_events ke
    LEFT JOIN devconnect_pretix_events_info dpe ON dpe.pretix_events_config_id = ke.event_id
    LEFT JOIN telegram_bot_events tbe ON dpe.pretix_events_config_id = tbe.ticket_event_id;
    `
  );

  return result.rows.map((row: LinkedPretixTelegramEvent) => ({
    ...row,
    eventName: row.eventName || FALLBACK_EVENT_IDS_TO_EVENT_NAME[row.eventID]
  }));
}

export interface ChatIDWithEventIDs {
  telegramChatID: string;
  ticketEventIds: string[];
}
export interface UserIDWithChatIDs {
  telegramUserID: string;
  telegramChatIDs: string[];
}

export async function fetchEventsPerChat(
  client: Pool
): Promise<ChatIDWithEventIDs[]> {
  const result = await sqlQuery(
    client,
    `SELECT 
      telegram_chat_id AS "telegramChatID",
      ARRAY_AGG(ticket_event_id) AS "ticketEventIds"
      FROM 
        telegram_bot_events
      GROUP BY 
        telegram_chat_id;`
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
    select * from telegram_chat_topics
    where telegram_chat_id = $1 and is_anon_topic is true
    `,
    [telegramChatId]
  );
  return result.rows;
}

export async function fetchTelegramTopicsByChatId(
  client: Pool,
  telegramChatId: number
): Promise<TelegramAnonChannel[]> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_chat_topics
    where telegram_chat_id = $1
    `,
    [telegramChatId]
  );
  return result.rows;
}

export async function fetchUserTelegramChats(
  client: Pool,
  telegramUserID: number
): Promise<UserIDWithChatIDs | null> {
  const result = await sqlQuery(
    client,
    `\
    SELECT 
      telegram_user_id AS "telegramUserID",
      ARRAY_AGG(telegram_chat_id) AS "telegramChatIDs"
    FROM 
      telegram_bot_conversations
    WHERE
      telegram_user_id = $1
    GROUP BY 
      telegram_user_id
    `,
    [telegramUserID]
  );
  return result.rows[0] ?? null;
}
