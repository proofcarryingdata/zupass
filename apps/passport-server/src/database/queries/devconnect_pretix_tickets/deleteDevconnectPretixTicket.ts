import { Pool } from "pg";
import { DevconnectPretixTicketDB } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete a particular user that has a ticket in pretix, and also their
 * identity commitment, if they have logged into the passport.
 */
export async function deleteDevconnectPretixTicket(
  client: Pool,
  params: DevconnectPretixTicketDB
): Promise<void> {
  await sqlQuery(
    client,
    `update devconnect_pretix_tickets set is_deleted=TRUE where email=$1 and devconnect_pretix_items_info_id=$2`,
    [params.email, params.devconnect_pretix_items_info_id]
  );
}
