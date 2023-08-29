export interface User {
  /** Public UUID */
  uuid: string;

  /** Semaphore public commitment */
  commitment: string;

  /** Email address they used to register */
  email: string;

  /** PCDpass-specific user metadata */
  superuserEventConfigIds?: number[];

  /** Zuzalu-specific user metadata */
  name?: string;
  role?: ZuzaluUserRole | undefined;
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

export enum ZuzaluUserRole {
  Visitor = "visitor",
  Resident = "resident",
  Organizer = "organizer"
}
