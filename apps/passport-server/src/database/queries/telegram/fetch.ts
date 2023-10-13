import { Pool } from "postgres-pool";
import {
  AnonNullifierInfo,
  TelegramAnonChannel,
  TelegramChat,
  TelegramConversation,
  TelegramEvent
} from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Interfaces
 */

export interface LinkedPretixTelegramEvent {
  telegramChatID: string | null;
  eventName: string;
  configEventID: string;
  isLinkedToChat: boolean;
}

export interface ChatIDWithEventIDs {
  telegramChatID: string;
  ticketEventIds: string[];
}

export interface UserIDWithChatIDs {
  telegramUserID: string;
  telegramChatIDs: string[];
}

export type ChatIDWithEventsAndMembership = ChatIDWithEventIDs & {
  isChatMember: boolean;
};

/**
 * Queries
 */

/**
 * Fetch the list of Telegram conversations for a user from the database.
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

/**
 *
 */
export async function fetchTelegramVerificationStatus(
  client: Pool,
  telegramUserId: number,
  telegramChatId: number
): Promise<boolean> {
  const result = await sqlQuery(
    client,
    `\
    select verified from telegram_bot_conversations
    where telegram_user_id = $1
    and telegram_chat_id = $2 
    `,
    [telegramUserId, telegramChatId]
  );

  return result.rows[0]?.verified ?? false;
}

export async function fetchAnonTopicNullifier(
  client: Pool,
  nullifierHash: string
): Promise<AnonNullifierInfo | undefined> {
  const result = await sqlQuery(
    client,
    `\
      select * from telegram_chat_anon_nullifiers 
      where nullifier = $1
    `,
    [nullifierHash]
  );
  return result.rows[0];
}

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

export async function fetchLinkedPretixAndTelegramEvents(
  client: Pool,
  telegramChatId?: number
): Promise<LinkedPretixTelegramEvent[]> {
  const result = await sqlQuery(
    client,
    `
    SELECT
      tbe.telegram_chat_id AS "telegramChatID",
      dpe.event_name AS "eventName",
      dpe.pretix_events_config_id AS "configEventID",
      CASE WHEN tbe.telegram_chat_id = $1 THEN true ELSE false END AS "isLinkedToChat"
    FROM 
      devconnect_pretix_events_info dpe 
    LEFT JOIN 
      telegram_bot_events tbe ON dpe.pretix_events_config_id = tbe.ticket_event_id;
    `,
    [telegramChatId]
  );

  return result.rows;
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

export async function fetchTelegramTopicById(
  client: Pool,
  telegramChatId: number,
  topicId: number,
  onlyAnon?: boolean
): Promise<TelegramAnonChannel | null> {
  let queryText = `
    SELECT * 
    FROM telegram_chat_topics
    WHERE 
        telegram_chat_id = $1 AND 
        topic_id = $2
  `;
  const queryParams = [telegramChatId, topicId];

  // Add the is_anon_topic condition if onlyAnon is true
  if (onlyAnon) {
    queryText += `AND is_anon_topic IS TRUE `;
  }

  const result = await sqlQuery(client, queryText, queryParams);
  return result.rows[0] ?? null;
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

// Fetch a list of Telegram chats that can be joined with the status of user
// The list is sorted such that chat a user hasn't joined are returned first
export async function fetchTelegramChatsWithMembershipStatus(
  client: Pool,
  userId: number
): Promise<
  Array<{
    telegramChatID: string;
    ticketEventIds: string[];
    isChatMember: boolean;
  }>
> {
  const result = await sqlQuery(
    client,
    `
    SELECT
      tbe.telegram_chat_id AS "telegramChatID",
        ARRAY_AGG(tbe.ticket_event_id) AS "ticketEventIds",
        CASE WHEN tbc.telegram_user_id IS NOT NULL THEN true ELSE false END AS "isChatMember"
    FROM 
        telegram_bot_events tbe 
    LEFT JOIN 
        telegram_bot_conversations tbc 
    ON 
        tbe.telegram_chat_id = tbc.telegram_chat_id AND tbc.telegram_user_id = $1
    GROUP BY 
        tbe.telegram_chat_id, tbc.telegram_user_id
    ORDER BY 
        "isChatMember" ASC;
    `,
    [userId]
  );
  return result.rows;
}
