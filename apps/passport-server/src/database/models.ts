/** A single Pretix ticket holder. May or may not have a passport yet. */
export interface PretixParticipant {
  email: string;
  name: string;
  role: string;
  residence: string;
  order_id: string;
  email_token: string;
}

/** A Zuzalu participant with passport (Pretix participant + commitment) */
export interface PassportParticipant extends PretixParticipant {
  uuid: string;
  commitment: string;
}
