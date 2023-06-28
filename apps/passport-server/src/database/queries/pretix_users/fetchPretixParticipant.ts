import { ClientBase, Pool } from "pg";
import { PassportParticipant, PretixParticipant } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch all users that have a ticket on pretix, even if they haven't
 * logged into the passport app. Includes their commitment, if they
 * have one.
 */
export async function fetchAllPretixParticipants(
  client: ClientBase | Pool
): Promise<Array<PretixParticipant>> {
  const result = await sqlQuery(
    client,
    `\
select
    p.email as email,
    p.name as name,
    p.role as role,
    p.order_id as order_id,
    c.commitment as commitment
from pretix_participants p
left join commitments c on c.participant_email = p.email;
`
  );

  return result.rows;
}

/**
 * Fetch a particular user that has a ticket on pretix, even if they
 * haven't logged into the passport app. Includes their commitment,
 * if they have one.
 */
export async function fetchPretixParticipant(
  client: ClientBase | Pool,
  email: string
): Promise<PretixParticipant | null> {
  const result = await sqlQuery(
    client,
    `\
select 
    p.email as email,
    p.name as name,
    p.role as role,
    p.order_id as order_id,
    c.commitment as commitment
from pretix_participants p
left join commitments c on c.participant_email = p.email
where p.email = $1;`,
    [email]
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
    p.order_id
from commitments c
join pretix_participants p on c.participant_email=p.email
left join email_tokens e on p.email = e.email
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
    p.order_id,
    p.visitor_date_ranges
from pretix_participants p
join commitments c on c.participant_email=p.email
left join email_tokens e on c.participant_email=e.email;`
  );
  return result.rows;
}
