import { Pool } from "pg";
import { DevconnectPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/*
 * Fetch all users that have a ticket on pretix, even if they haven't
 * logged into the passport app. Includes their commitment, if they
 * have one.
 */
export async function fetchAllDevconnectPretixTickets(
  client: Pool
): Promise<Array<DevconnectPretixTicket>> {
  const result = await sqlQuery(
    client,
    `\
select * from devconnect_pretix_tickets p;`
  );

  return result.rows;
}
