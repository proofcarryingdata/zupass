import { Pool } from "pg";
import { DevconnectPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete a particular user that has a ticket in pretix, and also their
 * identity commitment, if they have logged into the passport.
 */
export async function deleteDevconnectPretixTicket(
  client: Pool,
  params: DevconnectPretixTicket
): Promise<void> {
  await sqlQuery(
    client,
    `delete from devconnect_pretix_tickets where email=$1 and organizer_url=$2 and event_id=$3;`,
    [params.email, params.organizer_url, params.event_id]
  );
}
