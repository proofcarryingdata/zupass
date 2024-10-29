import { PoolClient } from "postgres-pool";
import {
  AnonMessage,
  AnonMessageWithDetails,
  ChatIDWithEventIDs,
  ChatIDWithEventsAndMembership,
  LinkedPretixTelegramEvent,
  TelegramChat,
  TelegramEvent,
  TelegramForwardFetch,
  TelegramTopicFetch,
  TelegramTopicWithFwdInfo,
  UserIDWithChatIDs
} from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch the list of Telegram conversations from the database.
 */
export async function fetchTelegramEventByEventId(
  client: PoolClient,
  eventId: string
): Promise<TelegramEvent[]> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_bot_events
    where ticket_event_id = $1
    `,
    [eventId]
  );

  return result.rows;
}

export async function fetchTelegramBotEvent(
  client: PoolClient,
  eventId: string,
  telegramChatID: string | number
): Promise<TelegramEvent> {
  const result = await sqlQuery(
    client,
    `\
    select * from telegram_bot_events
    where ticket_event_id = $1 and telegram_chat_id = $2
    `,
    [eventId, telegramChatID]
  );

  return result.rows[0] ?? null;
}

export async function fetchTelegramChat(
  client: PoolClient,
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
  client: PoolClient,
  telegramChatId: number | string
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
  client: PoolClient,
  distinct = true,
  currentTelegramChatId?: number
): Promise<LinkedPretixTelegramEvent[]> {
  const result = await sqlQuery(
    client,
    `
    SELECT ${
      distinct
        ? `DISTINCT ON (COALESCE(tbe.ticket_event_id, dpe.pretix_events_config_id))`
        : ""
    }
      tbe.telegram_chat_id AS "telegramChatID",
      dpe.event_name AS "eventName",
      dpe.pretix_events_config_id AS "configEventID",
      CASE WHEN tbe.telegram_chat_id = $1 THEN true ELSE false END AS "isLinkedToCurrentChat"
    FROM 
      devconnect_pretix_events_info dpe 
    LEFT JOIN 
      telegram_bot_events tbe ON dpe.pretix_events_config_id = tbe.ticket_event_id
    ORDER BY 
      COALESCE(tbe.ticket_event_id, dpe.pretix_events_config_id),
      CASE WHEN tbe.telegram_chat_id = $1 THEN true ELSE false END DESC,
      tbe.telegram_chat_id;
    `,
    [currentTelegramChatId]
  );

  return result.rows;
}

export async function fetchEventsPerChat(
  client: PoolClient
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
  client: PoolClient,
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
  client: PoolClient,
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
  client: PoolClient,
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
// If a chatId is provided, only chats with that id are returned.
export async function fetchTelegramChatsWithMembershipStatus(
  client: PoolClient,
  userId: number,
  chatId?: number
): Promise<ChatIDWithEventsAndMembership[]> {
  const result = await sqlQuery(
    client,
    `
    SELECT
        tbe.telegram_chat_id AS "telegramChatID",
        ARRAY_AGG(DISTINCT dpei.event_name) AS "eventNames",
        ARRAY_AGG(DISTINCT tbe.ticket_event_id) AS "ticketEventIds",
        BOOL_OR(tbc.telegram_user_id IS NOT NULL) AS "isChatMember"
    FROM 
        telegram_bot_events tbe
    LEFT JOIN 
        telegram_bot_conversations tbc 
    ON 
        tbe.telegram_chat_id = tbc.telegram_chat_id AND tbc.telegram_user_id = $1
    LEFT JOIN
        devconnect_pretix_events_info dpei
    ON
        tbe.ticket_event_id = dpei.pretix_events_config_id
    WHERE
        ($2::bigint IS NULL OR tbe.telegram_chat_id = $2::bigint)
    GROUP BY 
        tbe.telegram_chat_id
    ORDER BY 
        "isChatMember" ASC;
    `,
    [userId, chatId]
  );
  return result.rows;
}

export async function fetchTelegramTopic(
  client: PoolClient,
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
  client: PoolClient
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

/**
 * This query looks to see if the sendingTopicID a) exists in the forwarding table and b) has a receiving topic.
 * If so, it performs two left joins and populates the sending and receiving ids with the actual telegram chat topic.
 * The resulting value can be used to determine the source and destination for the forwarded message.
 */
export async function fetchTelegramTopicForwarding(
  client: PoolClient,
  sendingChatID: string | number,
  sendingTopicID?: string | number
): Promise<TelegramForwardFetch[]> {
  const result = await sqlQuery(
    client,
    `
    SELECT 
      tct.telegram_chat_id AS "telegramChatID",
      tct.*,
      sender_topic.id AS "senderID",
      sender_topic.topic_id AS "senderTopicID",
      sender_topic.topic_name AS "senderTopicName",
      sender_topic.telegram_chat_id AS "senderChatID",
      receiver_topic.id AS "receiverID",
      receiver_topic.topic_id AS "receiverTopicID",
      receiver_topic.topic_name AS "receiverTopicName",
      receiver_topic.telegram_chat_id AS "receiverChatID"
    FROM telegram_forwarding tf
    LEFT JOIN telegram_chat_topics tct ON tf.sender_chat_topic_id = tct.id
    LEFT JOIN telegram_chat_topics sender_topic ON tf.sender_chat_topic_id = sender_topic.id
    LEFT JOIN telegram_chat_topics receiver_topic ON tf.receiver_chat_topic_id = receiver_topic.id
    WHERE tct.telegram_chat_id = $1 AND (tct.topic_id = $2 OR ($2 IS NULL AND tct.topic_id IS NULL));
    `,
    [sendingChatID, sendingTopicID || null]
  );
  return result.rows;
}

export async function fetchTelegramAnonMessagesByNullifier(
  client: PoolClient,
  nullifierHash: string
): Promise<AnonMessage[]> {
  const result = await sqlQuery(
    client,
    `
    select * from telegram_chat_anon_messages 
    where nullifier = $1
    `,
    [nullifierHash]
  );
  return result.rows;
}

export async function fetchTelegramAnonMessagesById(
  client: PoolClient,
  id: string
): Promise<(AnonMessage & { telegram_chat_id: string }) | null> {
  const result = await sqlQuery(
    client,
    `
    SELECT tam.*, tct.telegram_chat_id
    FROM telegram_chat_anon_messages tam
    LEFT JOIN telegram_chat_topics tct ON tam.chat_topic_id = tct.id
    WHERE tam.id = $1
    `,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function fetchTelegramChatTopicById(
  client: PoolClient,
  chatTopicId: number
): Promise<TelegramTopicFetch> {
  const result = await sqlQuery(
    client,
    `
    select telegram_chat_id AS "telegramChatID", * from telegram_chat_topics
    where id = $1
    `,
    [chatTopicId]
  );
  return result.rows[0];
}

export async function fetchTelegramAnonMessagesWithTopicByNullifier(
  client: PoolClient,
  nullifierHash: string
): Promise<AnonMessageWithDetails[]> {
  const result = await sqlQuery(
    client,
    `
    select m.*, t.topic_name, t.telegram_chat_id, coalesce(r.reactions, '{}') as reactions
      from telegram_chat_anon_messages m
      inner join telegram_chat_topics t on m.chat_topic_id = t.id
      left join (select anon_message_id, array_agg(reaction) as reactions from telegram_chat_reactions group by anon_message_id) r on r.anon_message_id = m.id
      where m.nullifier = $1
    `,
    [nullifierHash]
  );
  return result.rows;
}
