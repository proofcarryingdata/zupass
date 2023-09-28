import { Pool } from "postgres-pool";
import { LoggedInZuzaluUser, ZuzaluUser } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Fetch all users that have a Zuzalu ticket on pretix, even if they haven't
 * logged into Zupass.
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
    u.commitment as commitment,
    u.uuid as uuid,
    p.visitor_date_ranges as visitor_date_ranges
from zuzalu_pretix_tickets p
left join users u on u.email = p.email;`
  );

  return result.rows;
}

/**
 * Fetch a particular user that has a Zuzalu ticket. Works even in the case
 * that this user hasn't logged into Zupass.
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
    u.commitment as commitment,
    u.uuid as uuid,
    p.visitor_date_ranges as visitor_date_ranges
from zuzalu_pretix_tickets p
left join users u on u.email = p.email
where p.email = $1;`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Fetch a particular user that has both logged into Zupass and also
 * holds a Zuzalu ticket.
 */
export async function fetchLoggedInZuzaluUser(
  client: Pool,
  params: { uuid: string }
): Promise<LoggedInZuzaluUser | null> {
  const result = await sqlQuery(
    client,
    `\
select 
    u.uuid,
    u.commitment,
    p.email,
    p.name,
    p.role,
    p.order_id,
    p.visitor_date_ranges as visitor_date_ranges
from users u
join zuzalu_pretix_tickets p on u.email=p.email
left join email_tokens e on p.email = e.email
where u.uuid = $1;`,
    [params.uuid]
  );
  return result.rows[0] || null;
}

/**
 * Fetch all users who both have a Zuzalu ticket and have logged
 * into Zupass.
 */
export async function fetchAllLoggedInZuzaluUsers(
  client: Pool
): Promise<LoggedInZuzaluUser[]> {
  const result = await sqlQuery(
    client,
    `\
select 
    u.uuid,
    u.commitment,
    p.email,
    p.name,
    p.role,
    p.order_id,
    p.visitor_date_ranges
from zuzalu_pretix_tickets p
join users u on u.email=p.email
left join email_tokens e on u.email=e.email;`
  );
  return result.rows;
}

/**
 * Fetches the quantity of users that both have logged into Zupass
 * and have a Zuzalu ticket.
 */
export async function fetchLoggedInZuzaluUserCount(
  client: Pool
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
select count(*) as count
from zuzalu_pretix_tickets p
join users u on u.email=p.email`
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Fetches the quantity of Zuzalu tickets.
 */
export async function fetchSyncedZuzaluTicketCount(
  client: Pool
): Promise<number> {
  const result = await sqlQuery(
    client,
    `select count(*) as count from zuzalu_pretix_tickets`
  );
  return parseInt(result.rows[0].count, 10);
}
