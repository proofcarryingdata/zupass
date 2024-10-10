import { PoolClient } from "postgres-pool";
import { UserRow, ZuzaluPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export type UserWithZuzaluTickets = UserRow & {
  zuzaluTickets: ZuzaluPretixTicket[];
};

/**
 * For each user with a Zuzalu pretix ticket, return the user, along with
 * an array of their Zuzalu pretix tickets.
 */
export async function fetchAllUsersWithZuzaluTickets(
  client: PoolClient
): Promise<UserWithZuzaluTickets[]> {
  const result = await sqlQuery(
    client,
    `
    select
u.*,
array_agg(distinct ue.email) as emails,
array_agg(zpt.name) as names,
array_agg(zpt.email) as ticket_emails,
array_agg(zpt.order_id) as ticket_order_id,
array_agg(zpt.role) as ticket_role,
array_agg(zpt.visitor_date_ranges) as ticket_visitor_date_ranges
from
users u
inner join user_emails ue on u.uuid = ue.user_id
inner join zuzalu_pretix_tickets zpt on ue.email = zpt.email
group by u.uuid;`
  );

  const usersWithTickets: UserWithZuzaluTickets[] = [];

  for (const row of result.rows) {
    const user: UserRow = {
      uuid: row.uuid,
      commitment: row.commitment,
      emails: row.emails,
      salt: row.salt,
      encryption_key: row.encryption_key,
      terms_agreed: row.terms_agreed,
      extra_issuance: row.extra_issuance,
      time_created: row.time_created,
      time_updated: row.time_updated,
      semaphore_v4_commitment: row.semaphore_v4_commitment,
      semaphore_v4_pubkey: row.semaphore_v4_pubkey
    } satisfies UserRow;

    const zuzaluTickets: ZuzaluPretixTicket[] = [];

    for (let i = 0; i < row.names.length; i++) {
      zuzaluTickets.push({
        email: row.ticket_emails[i],
        name: row.names[i],
        order_id: row.ticket_order_id[i],
        role: row.ticket_role[i],
        visitor_date_ranges: row.ticket_visitor_date_ranges[i]
      } satisfies ZuzaluPretixTicket);
    }

    usersWithTickets.push({ ...user, zuzaluTickets });
  }

  return usersWithTickets;
}

/**
 * Just gets all the Zuzalu pretix tickets, not associating them with
 * Zupass users in any way.
 */
export async function fetchAllZuzaluPretixTickets(
  client: PoolClient
): Promise<ZuzaluPretixTicket[]> {
  const result = await sqlQuery(
    client,
    `\
select * from zuzalu_pretix_tickets;`
  );

  return result.rows;
}
