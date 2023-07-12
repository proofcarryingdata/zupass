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
  name: string;
  event_id: string;
  organizer_url: string;
  item_ids: number[];
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
  Organizer = "organizer",
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

export interface PreventEventsConfig {
  event_id: string;
  active_item_ids: number[]; // relevant item IDs that correspond to ticket products
  attendee_email_question_id: number; // question ID of "attendee email" question on items
}

//
export interface PretixOrganizersConfig {
  organizer_url: string;
  token: string;
  events: PreventEventsConfig[];
}
