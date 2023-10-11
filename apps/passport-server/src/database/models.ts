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

/**
 * A conversation between the Telegram bot and a user, and associated params.
 */
export interface TelegramConversation {
  telegram_user_id: number;
  telegram_chat_id: number;
  verified: boolean;
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
  commitment: string | null;
  uuid: string | null;
}

export interface DevconnectPretixTicket {
  email: string;
  full_name: string;
  devconnect_pretix_items_info_id: string;
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
  commitment: string;
  salt: string | null;
  encryption_key: string | null;
}

export interface UserRow {
  uuid: string;
  commitment: string;
  email: string;
  salt: string | null;
  encryption_key: string | null;
  account_reset_timestamps: string[];
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
  events: PretixEventsConfig[];
}

export interface PretixOrganizerRow {
  id: string;
  organizer_url: string;
  token: string;
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

export interface TelegramAnonChannel {
  telegram_chat_id: string;
  topic_id: string;
  topic_name: string;
  is_anon_topic: boolean;
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
}

// Known ticket type with the actual public key
export interface KnownTicketTypeWithKey extends KnownTicketType {
  known_public_key_type: KnownPublicKeyType;
  public_key: string;
}

export interface AnonNullifierInfo {
  nullifier: string;
  message_timestamps: string[];
}
