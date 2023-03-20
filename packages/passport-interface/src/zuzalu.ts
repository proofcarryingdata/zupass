export interface ZuParticipant {
  /** Public UUID */
  uuid: string;

  /** Semaphore public commitment */
  commitment: string;

  /** Participant metadata */
  name: string;
  email: string;
  role: string;
  residence: string;
}
