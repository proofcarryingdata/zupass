import { Pool } from "pg";
import { DevconnectPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/*
 * Fetch all users that have a ticket on pretix, even if they haven't
 * logged into the passport app.
 */
export async function fetchAllDevconnectPretixTickets(
  client: Pool
): Promise<Array<DevconnectPretixTicket>> {
  const result = await sqlQuery(
    client,
    `\
      select * from devconnect_pretix_tickets;`
  );

  // Ensure item IDs are converted to numbers
  return result.rows.map((row) => ({
    ...row,
    item_ids: row.item_ids.map(Number),
  }));
}

/*
 * Fetch users by org and event that have a ticket on pretix, even if they haven't
 * logged into the passport app.
 */
export async function fetchDevconnectPretixTicketsByOrgAndEvent(
  client: Pool,
  orgURL: string,
  eventID: string
): Promise<Array<DevconnectPretixTicket>> {
  const result = await sqlQuery(
    client,
    `\
      select * from devconnect_pretix_tickets
      where organizer_url=$1 and event_id=$2;`,
    [orgURL, eventID]
  );

  // Ensure item IDs are converted to numbers
  return result.rows.map((row) => ({
    ...row,
    item_ids: row.item_ids.map(Number),
  }));
}
