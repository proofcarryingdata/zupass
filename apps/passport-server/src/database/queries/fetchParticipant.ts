import { ClientBase, Pool } from "pg";
import { PassportParticipant, PretixParticipant } from "../types";

/** Fetch a ticketed participant, with or without Passport yet. */
export async function fetchPretixParticipant(
  client: ClientBase | Pool,
  params: { email: string }
): Promise<PretixParticipant | null> {
  const result = await client.query(
    `\
select 
    email,
    name,
    role,
    residence,
    order_id,
    email_token
from pretix_participants
where email = $1;`,
    [params.email]
  );
  return result.rows[0] || null;
}

/** Fetch a participant who already has Passport installed. */
export async function fetchPassportParticipant(
  client: ClientBase | Pool,
  params: { uuid: string }
): Promise<PassportParticipant | null> {
  const result = await client.query(
    `\
select 
    c.uuid,
    c.commitment,
    c.email,
    p.name,
    p.role,
    p.residence,
    p.order_id
from commitments c
join pretix_participants p on c.participant_email=p.email
where c.uuid = $1;`,
    [params.uuid]
  );
  return result.rows[0] || null;
}

/** Fetch all participants who have a Passport. */
export async function fetchPassportParticipants(
  client: ClientBase | Pool
): Promise<PassportParticipant[]> {
  const result = await client.query(
    `\
select 
    c.uuid,
    c.commitment,
    c.email,
    p.name,
    p.role,
    p.residence,
    p.order_id
from commitments c
join pretix_participants p on c.participant_email=p.email;`
  );
  return result.rows;
}
