import { ClientBase, Pool } from "pg";
import { PassportParticipant, PretixParticipant } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function fetchAllPretixParticipants(
  client: ClientBase | Pool
): Promise<PretixParticipant[]> {
  const result = await sqlQuery(client, `select * from pretix_participants;`);

  return result.rows;
}

/** Fetch a ticketed participant, with or without Passport yet. */
export async function fetchPretixParticipant(
  client: ClientBase | Pool,
  params: { email: string }
): Promise<(PretixParticipant & { commitment: string; token: string }) | null> {
  const result = await sqlQuery(
    client,
    `\
select 
    pretix_participants.email as email,
    name,
    role,
    residence,
    order_id,
    token
from pretix_participants
join email_tokens e on pretix_participants.email = e.email
where pretix_participants.email = $1;`,
    [params.email]
  );
  return result.rows[0] || null;
}

/** Fetch a participant who already has Passport installed. */
export async function fetchPassportParticipant(
  client: ClientBase | Pool,
  params: { uuid: string }
): Promise<PassportParticipant | null> {
  const result = await sqlQuery(
    client,
    `\
select 
    c.uuid,
    c.commitment,
    p.email,
    p.name,
    p.role,
    p.residence,
    p.order_id
from commitments c
join pretix_participants p on c.participant_email=p.email
join email_tokens e on p.email = e.email
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
    p.email,
    p.name,
    p.role,
    p.residence,
    p.order_id,
    p.visitor_date_ranges
from pretix_participants p
join commitments c on c.participant_email=p.email
join email_tokens e on c.participant_email=e.email;`
  );
  return result.rows;
}
