import { Pool } from "postgres-pool";
import {
  ChatIDWithEventIDs,
  ChatIDWithEventsAndMembership,
  LinkedPretixTelegramEvent,
  TelegramChat,
  TelegramEvent,
  TelegramTopicFetch,
  TelegramTopicWithFwdInfo,
  UserIDWithChatIDs
} from "../../models";
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

export async function fetchEventsWithTelegramChats(
  client: Pool,
  currentTelegramChatId?: number
): Promise<LinkedPretixTelegramEvent[]> {
  const result = await sqlQuery(
    client,
    `
    SELECT
      tbe.telegram_chat_id AS "telegramChatID",
      dpe.event_name AS "eventName",
      dpe.pretix_events_config_id AS "configEventID",
      CASE WHEN tbe.telegram_chat_id = $1 THEN true ELSE false END AS "isLinkedToCurrentChat"
    FROM 
      devconnect_pretix_events_info dpe 
    LEFT JOIN 
      telegram_bot_events tbe ON dpe.pretix_events_config_id = tbe.ticket_event_id;
    `,
    [currentTelegramChatId]
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
): Promise<TelegramTopicFetch[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT telegram_chat_id AS "telegramChatID", * from telegram_chat_topics
    where telegram_chat_id = $1 and is_anon_topic is true
    `,
    [telegramChatId]
  );
  return result.rows;
}

export async function fetchTelegramTopicsByChatId(
  client: Pool,
  telegramChatId: number
): Promise<TelegramTopicFetch[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT telegram_chat_id AS "telegramChatID", * from telegram_chat_topics
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
): Promise<ChatIDWithEventsAndMembership[]> {
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

export async function fetchTelegramTopic(
  client: Pool,
  telegramChatId: number | string,
  topicId?: number | string
): Promise<TelegramTopicFetch | null> {
  const query = `
    SELECT telegram_chat_id AS "telegramChatID", * 
    FROM telegram_chat_topics
    WHERE 
        telegram_chat_id = $1 AND 
        (topic_id = $2 OR ($2 IS NULL AND topic_id IS NULL))
  `;
  const result = await sqlQuery(client, query, [
    telegramChatId,
    topicId || null
  ]);
  return result.rows[0] ?? null;
}

export async function fetchTelegramTopicsReceiving(
  client: Pool
): Promise<TelegramTopicWithFwdInfo[]> {
  const result = await sqlQuery(
    client,
    ` 
    SELECT telegram_chat_id AS "telegramChatID", * 
    FROM telegram_chat_topics tct
    JOIN telegram_forwarding tf ON tct.id = tf.receiver_chat_topic_id
    WHERE tf.receiver_chat_topic_id IS NOT NULL;`,
    []
  );
  return result.rows;
}

const linkedDestinationToTopic = (
  row: any
): TelegramTopicFetch & { forwardDestination: TelegramTopicFetch } => {
  return {
    ...row,
    forwardDestination: {
      id: row.forwardingID,
      topic_id: row.forwardingTopicID,
      topic_name: row.forwardingTopicName,
      telegramChatID: row.forwardingChatID
    }
  };
};

export async function fetchTelegramTopicForwarding(
  client: Pool,
  telegramChatID: string | number,
  topicId?: string | number
): Promise<
  (TelegramTopicFetch & { forwardDestination: TelegramTopicFetch })[]
> {
  const result = await sqlQuery(
    client,
    `
    SELECT 
      tct.telegram_chat_id AS "telegramChatID",
      tct.*,
      tf2.id AS "forwardingID",
      tf2.topic_id AS "forwardingTopicID",
      tf2.topic_name AS "forwardingTopicName",
      tf2.telegram_chat_id AS "forwardingChatID"
    FROM telegram_chat_topics tct
    JOIN telegram_forwarding tf ON tct.id = tf.sender_chat_topic_id
    LEFT JOIN telegram_chat_topics tf2 ON tf.receiver_chat_topic_id = tf2.id
    WHERE tct.telegram_chat_id = $1 AND (tct.topic_id = $2 OR ($2 IS NULL AND tct.topic_id IS NULL)) AND tf.sender_chat_topic_id IS NOT NULL;`,
    [telegramChatID, topicId || null]
  );
  return result.rows.map((row) => linkedDestinationToTopic(row));
}
