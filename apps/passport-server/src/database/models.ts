import { DateRange } from "@pcd/passport-interface";

export interface HistoricSemaphoreGroup {
  id: number;
  groupId: string;
  rootHash: string;
  serializedGroup: string;
  timeCreated: string;
}

/** A single Pretix ticket holder. May or may not have a passport yet. */
export interface PretixParticipant {
  email: string;
  name: string;
  role: ParticipantRole;
  residence: string;
  order_id: string;
  visitor_date_ranges?: DateRange[];
  commitment?: string;
}

/** A Zuzalu participant with passport (Pretix participant + commitment) */
export interface PassportParticipant extends PretixParticipant {
  uuid: string;
  commitment: string;
}

export enum ParticipantRole {
  Visitor = "visitor",
  Resident = "resident",
  Organizer = "organizer",
}

export interface CommitmentRow {
  uuid: string;
  commitment: string;
  participant_email: string;
}

export interface EncryptedStorageModel {
  blob_key: string;
  encrypted_blob: string;
}
