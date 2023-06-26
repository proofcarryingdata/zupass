export interface ZuParticipant {
  /** Public UUID */
  uuid: string;

  /** Semaphore public commitment */
  commitment: string;

  /** Email address they used to register */
  email: string;

  /** Zuzalu-Specific Participant metadata */
  name?: string;
  role?: ParticipantRole;
  residence?: string;
  visitor_date_ranges?: DateRange[];
}

export interface DateRange {
  date_from?: string | null;
  date_to?: string | null;
}

export interface FullDateRange {
  date_from: string;
  date_to: string;
}

export enum ParticipantRole {
  Visitor = "visitor",
  Resident = "resident",
  Organizer = "organizer",
}
