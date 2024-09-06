import {
  DateRange,
  KnownPublicKeyType,
  KnownTicketGroup,
  ZuzaluUserRole
} from "@pcd/passport-interface";

/**
 * All zuzalu tickets get synced to our database into this data structure.
 */
export interface ZuzaluPretixTicket {
  email: string;
  name: string;
  role: ZuzaluUserRole;
  order_id: string;
  visitor_date_ranges?: DateRange[] | null;
}

export interface TelegramReactionCount {
  reaction: string;
  count: number;
}

/**
 * A conversation between the Telegram bot and a user, and associated params.
 */
export interface TelegramConversation {
  telegram_user_id: number;
  telegram_chat_id: number;
  verified: boolean;
  semaphore_id: string;
  telegram_username: string;
}

/**
 * A mapping of event IDs to Telegram channels
 */
export interface TelegramEvent {
  ticket_event_id: string;
  telegram_chat_id: number;
}

export interface TelegramChat {
  uuid: string | null;
  telegram_chat_id: number;
}

/**
 * A zuzalu pretix-ticket-holder that may or may not have logged in yet.
 */
export interface ZuzaluUser extends ZuzaluPretixTicket {
  /**
   * Semaphore v3 commitment.
   */
  commitment: string | null;
  uuid: string | null;
  time_created: Date;
  time_updated: Date;
  emails: string[];
}

export interface DevconnectPretixTicket {
  email: string;
  full_name: string;
  devconnect_pretix_items_info_id: string;
  pretix_events_config_id: string;
  is_deleted: boolean;
  is_consumed: boolean;
  position_id: string;
  secret: string;
  pretix_checkin_timestamp: Date | null;
}

export interface DevconnectPretixTicketWithCheckin
  extends DevconnectPretixTicket {
  checker: string | null;
  zupass_checkin_timestamp: Date | null;
}

export interface DevconnectPretixTicketWithCheckinDB
  extends DevconnectPretixTicketWithCheckin {
  id: string;
}

export interface DevconnectPretixTicketDB
  extends DevconnectPretixTicketWithCheckin {
  id: string;
}

export interface DevconnectPretixTicketDBWithCheckinListID
  extends DevconnectPretixTicketDB {
  checkin_list_id: string;
}

// DevconnectPretixTicket with all relevant fields for ticket PCD included,
// namely the `event_name` and `item_name`
export interface DevconnectPretixTicketDBWithEmailAndItem
  extends DevconnectPretixTicketDB {
  event_name: string;
  item_name: string;
  pretix_events_config_id: string;
}

// A ticket but with no PII
export interface DevconnectPretixRedactedTicket {
  hashed_email: string;
  devconnect_pretix_items_info_id: string;
  pretix_events_config_id: string;
  is_consumed: boolean;
  position_id: string;
  secret: string;
  checker: string | null;
  pretix_checkin_timestamp: Date | null;
}

export interface DevconnectSuperuser {
  ticket_id: string;
  email: string;
  full_name: string;
  is_deleted: boolean;
  is_consumed: boolean;
  devconnect_pretix_items_info_id: string;
  devconnect_pretix_events_info_id: string;
  item_name: string;
  item_id: string;
  pretix_events_config_id: string;
  pretix_organizers_config_id: string;
  event_name: string;
  event_id: string;
}

export interface DevconnectProduct {
  product_id: string;
  event_id: string;
}

/**
 * A zuzalu pretix-ticket-holder that has logged into Zupass.
 */
export interface LoggedInZuzaluUser extends ZuzaluUser {
  uuid: string;
  /**
   * Semaphore v3 commitment.
   */
  commitment: string;
  salt: string | null;
  encryption_key: string | null;
  terms_agreed: number;
}

export interface UserRow {
  uuid: string;
  /**
   * Semaphore v3 commitment.
   */
  commitment: string;
  emails: string[];
  salt: string | null;
  encryption_key: string | null;
  terms_agreed: number;
  /**
   * See {@link IssuanceService} - only relevant past the ticket re-issuance cutoff date. If this
   * is `true`, this user can request one more set of Devconnect tickets, after which this will
   * revert back to `false`.
   */
  extra_issuance: boolean;
  time_created: Date;
  time_updated: Date;

  /**
   * A user's commitment is the poseidon2 hash of their EdDSA public key in semaphore V4
   */
  semaphore_v4_commitment?: string | null;
  /**
   * EdDSA public key identifying a user in semaphore v4.
   */
  semaphore_v4_pubkey?: string | null;
}

export interface EncryptedStorageModel {
  blob_key: string;
  encrypted_blob: string;
  revision: string; // bigint in database returned to JavaScript as string
}

export interface HistoricSemaphoreGroup {
  id: number;
  groupId: string;
  rootHash: string;
  serializedGroup: string;
  timeCreated: string;
}

// Database representation of Pretix event configuration
export interface PretixEventsConfig {
  id: string;
  event_id: string;
  pretix_organizers_config_id: string;
  active_item_ids: string[]; // relevant item IDs that correspond to ticket products
  superuser_item_ids: string[];
}

// Database representation of Pretix organizer configuration
export interface PretixOrganizersConfig {
  id: string;
  organizer_url: string;
  token: string;
  disabled: boolean;
  events: PretixEventsConfig[];
}

export interface PretixOrganizerRow {
  id: string;
  organizer_url: string;
  token: string;
  disabled: boolean;
}

export interface PretixEventInfo {
  id: string;
  pretix_events_config_id: string;
  event_name: string;
  checkin_list_id: string;
}

export interface PretixItemInfo {
  id: string;
  item_id: string;
  devconnect_pretix_events_info_id: string;
  item_name: string;
}

export interface TelegramTopicFetch {
  telegramChatID: string;
  topic_id: string | null;
  topic_name: string;
  is_anon_topic: boolean;
  id: number;
}

export interface TelegramTopicWithFwdInfo extends TelegramTopicFetch {
  sender_chat_topic_id: number | null;
  receiver_chat_topic_id: number | null;
}

// Representation of a "known public key" as fetched from the DB
export interface KnownPublicKeyDB {
  public_key_name: string;
  public_key_type: KnownPublicKeyType;
  public_key: string;
}

// A known ticket type as represented in the DB. Allows us to match tickets to
// known combinations of event ID, product ID, and public key.
export interface KnownTicketType {
  identifier: string;
  event_id: string;
  product_id: string;
  known_public_key_name: string;
  ticket_group: KnownTicketGroup;
  event_name: string;
}

// Known ticket type with the actual public key
export interface KnownTicketTypeWithKey extends KnownTicketType {
  known_public_key_type: KnownPublicKeyType;
  public_key: string;
}

export interface AnonNullifierInfo {
  nullifier: string;
  message_timestamps: string[];
  chat_topic_id: number;
}

/**
 * A Zuconnect ticket in the DB.
 */
export interface ZuconnectTicketDB {
  // Our internal ticket ID, a UUID
  id: string;
  // Ticket ID received from Tripsha
  external_ticket_id: string;
  // Our internal product ID, see
  // {@link ZUCONNECT_PRODUCT_ID_MAPPINGS}
  product_id: string;
  attendee_email: string;
  attendee_name: string;
  is_deleted: boolean;
  is_mock_ticket: boolean;
  extra_info: string[];
  emails: string[];
}

export interface LinkedPretixTelegramEvent {
  telegramChatID: string | undefined;
  eventName: string;
  configEventID: string;
  isLinkedToCurrentChat: boolean;
}

export interface ChatIDWithEventIDs {
  telegramChatID: string;
  ticketEventIds: string[];
  eventNames: string[];
}
export interface UserIDWithChatIDs {
  telegramUserID: string;
  telegramChatIDs: string[];
}

export interface ChatIDWithEventsAndMembership extends ChatIDWithEventIDs {
  isChatMember: boolean;
}

export interface TelegramForwardFetch {
  senderID: number;
  senderTopicID: string | null;
  senderTopicName: string;
  senderChatID: string;
  receiverID: number;
  receiverTopicID: string | null;
  receiverTopicName: string;
  receiverChatID: string;
}

// FrogCrypto Data Models

/**
 * A state record for a single feed for a user
 *
 * Currently, this is only used for the cooldown timer where we save when the user last fetched from a feed.
 */
export interface FrogCryptoUserFeedState {
  /**
   * User semaphore id
   */
  semaphore_id: string;
  /**
   * Feed id
   */
  feed_id: string;
  /**
   * Timestamp of the last time the user fetched from this feed
   */
  last_fetched_at: Date;
}

export interface AnonMessage {
  id: number;
  nullifier: string;
  chat_topic_id: number;
  content: string;
  proof: string;
  message_timestamp: string;
  sent_message_id: string;
}

export interface AnonMessageWithDetails extends AnonMessage {
  telegram_chat_id: number;
  chat_name: string;
  topic_name: string;
  reactions: string[];
}

export type PoapEvent =
  | "devconnect"
  | "zuzalu23"
  | "zuconnect"
  | "vitalia"
  | "edgecitydenver"
  | "ethlatam";

export interface RateLimitBucket {
  action_type: string;
  action_id: string;
  remaining: number;
  // last_take is a bigint in Postgres, which node-postgres turns into a string
  last_take: string;
}

export interface GenericIssuancePipelineRow {
  id: string;
  owner_user_id: string;
  editor_user_ids: string[];
  time_created: Date;
  time_updated: Date;
  pipeline_type: string;
  // Config corresponds to the `options` property of PretixPipelineDefinition/
  // LemonadePipelineDefinition. There is no generic or base type for this, but
  // it's represented as JSON in the DB.
  // Using "any" here is not great, but using "unknown" means that we would
  // need some way to parse the config from the JSON, e.g. a Zod schema. This
  // might be worth coming back to once the configuration format is stable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
}

export interface GenericIssuanceUserRow {
  id: string;
  email: string;
  is_admin: boolean;
  time_created: Date;
  time_updated: Date;
}
