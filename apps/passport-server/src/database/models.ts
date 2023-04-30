import { DateRange } from "@pcd/passport-interface";

/** A single Pretix ticket holder. May or may not have a passport yet. */
export interface PretixParticipant {
  email: string;
  name: string;
  role: ParticipantRole;
  residence: string;
  order_id: string;
  email_token: string;
  visitor_date_ranges?: DateRange[];
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
