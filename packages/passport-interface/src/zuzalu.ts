export interface ZuParticipant {
  /** Public UUID */
  uuid: string;

  /** Semaphore public commitment */
  commitment: string;

  /** Participant metadata */
  email: string;
  name: string;
  role: string;
  residence: string;
  visitor_date_ranges: DateRange[];
}

export interface DateRange {
  date_from: string;
  date_to: string;
}
