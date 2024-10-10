import { PoolClient } from "postgres-pool";
import { DevconnectPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Soft delete a Devconnect ticket.
 */
export async function softDeleteDevconnectPretixTicket(
  client: PoolClient,
  params: DevconnectPretixTicket
): Promise<void> {
  await sqlQuery(
    client,
    `update devconnect_pretix_tickets set is_deleted=TRUE where
    position_id = $1 and pretix_events_config_id = $2`,
    [params.position_id, params.pretix_events_config_id]
  );
}
