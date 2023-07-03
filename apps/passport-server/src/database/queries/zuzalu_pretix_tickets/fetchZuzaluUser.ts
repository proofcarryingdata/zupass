import { Pool } from "pg";
import { LoggedInZuzaluUser, ZuzaluUser } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch all users that have a ticket on pretix, even if they haven't
 * logged into the passport app. Includes their commitment, if they
 * have one.
 */
export async function fetchAllZuzaluUsers(
  client: Pool
): Promise<Array<ZuzaluUser>> {
  const result = await sqlQuery(
    client,
    `\
select
    p.email as email,
    p.name as name,
    p.role as role,
    p.order_id as order_id,
    c.commitment as commitment,
    c.uuid as uuid,
    p.visitor_date_ranges as visitor_date_ranges
from zuzalu_pretix_tickets p
left join commitments c on c.email = p.email;`
  );

  return result.rows;
}

/**
 * Fetch a particular user that has a ticket on pretix, even if they
 * haven't logged into the passport app. Includes their commitment,
 * if they have one.
 */
export async function fetchZuzaluUser(
  client: Pool,
  email: string
): Promise<ZuzaluUser | LoggedInZuzaluUser | null> {
  const result = await sqlQuery(
    client,
    `\
select 
    p.email as email,
    p.name as name,
    p.role as role,
    p.order_id as order_id,
    c.commitment as commitment,
    c.uuid as uuid,
    p.visitor_date_ranges as visitor_date_ranges
from zuzalu_pretix_tickets p
left join commitments c on c.email = p.email
where p.email = $1;`,
    [email]
  );
  return result.rows[0] || null;
}

/** Fetch a Zuzalu user who already has Passport installed. */
export async function fetchLoggedInZuzaluUser(
  client: Pool,
  params: { uuid: string }
): Promise<LoggedInZuzaluUser | null> {
  const result = await sqlQuery(
    client,
    `\
select 
    c.uuid,
    c.commitment,
    p.email,
    p.name,
    p.role,
    p.order_id,
    p.visitor_date_ranges as visitor_date_ranges
from commitments c
join zuzalu_pretix_tickets p on c.email=p.email
left join email_tokens e on p.email = e.email
where c.uuid = $1;`,
    [params.uuid]
  );
  return result.rows[0] || null;
}

/** Fetch all participants who have a Passport. */
export async function fetchAllLoggedInZuzaluUsers(
  client: Pool
): Promise<LoggedInZuzaluUser[]> {
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
from zuzalu_pretix_tickets p
join commitments c on c.email=p.email
left join email_tokens e on c.email=e.email;`
  );
  return result.rows;
}
