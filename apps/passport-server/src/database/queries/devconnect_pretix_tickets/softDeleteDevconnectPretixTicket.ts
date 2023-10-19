import { Pool } from "postgres-pool";
import { DevconnectPretixTicketDB } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete a particular user that has a ticket in pretix, and also their
 * identity commitment, if they have logged into Zupass.
 */
export async function softDeleteDevconnectPretixTicket(
  client: Pool,
  params: DevconnectPretixTicketDB
): Promise<void> {
  await sqlQuery(
    client,
    `update devconnect_pretix_tickets set is_deleted=TRUE where
    position_id = $1 and pretix_events_config_id = $2`,
    [params.position_id, params.pretix_events_config_id]
  );
}
