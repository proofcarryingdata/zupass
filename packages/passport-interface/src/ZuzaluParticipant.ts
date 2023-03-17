export interface ZuzaluParticipant {
  /** Semaphore public commitment */
  commitment: string;

  /** Participant metadata */
  name: string;
  email: string;
  role: string;
  residence: string;
}
