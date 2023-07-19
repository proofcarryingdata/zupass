import { DateRange } from "@pcd/passport-interface";

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
 * A zuzalu pretix-ticket-holder that may or may not have logged in yet.
 */
export interface ZuzaluUser extends ZuzaluPretixTicket {
  commitment: string | null;
  uuid: string | null;
}

export interface DevconnectPretixTicket {
  email: string;
  full_name: string;
  devconnect_pretix_items_info_id: number;
  is_deleted: boolean;
}

export interface DevconnectPretixTicketDB extends DevconnectPretixTicket {
  id: number;
}

// DevconnectPretixTicket with all relevant fields for ticket PCD included,
// namely the `event_name` and `item_name`
export interface DevconnectPretixTicketDBWithEmailAndItem
  extends DevconnectPretixTicketDB {
  event_name: string;
  item_name: string;
  is_consumed: boolean;
}

/**
 * A zuzalu pretix-ticket-holder that has logged in to the passport.
 */
export interface LoggedInZuzaluUser extends ZuzaluUser {
  uuid: string;
  commitment: string;
}

export enum ZuzaluUserRole {
  Visitor = "visitor",
  Resident = "resident",
  Organizer = "organizer"
}

export interface CommitmentRow {
  uuid: string;
  commitment: string;
  email: string;
}

export interface EncryptedStorageModel {
  blob_key: string;
  encrypted_blob: string;
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
  id: number;
  event_id: string;
  pretix_organizers_config_id: number;
  active_item_ids: string[]; // relevant item IDs that correspond to ticket products
}

// Database representation of Pretix organizer configuration
export interface PretixOrganizersConfig {
  id: number;
  organizer_url: string;
  token: string;
  events: PretixEventsConfig[];
}

export interface PretixOrganizerRow {
  id: number;
  organizer_url: string;
  token: string;
}

export interface PretixEventInfo {
  id: number;
  pretix_events_config_id: number;
  event_name: string;
}

export interface PretixItemInfo {
  id: number;
  item_id: string;
  devconnect_pretix_events_info_id: number;
  item_name: string;
}
