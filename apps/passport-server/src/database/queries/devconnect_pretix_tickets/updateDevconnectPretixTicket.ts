import { Pool } from "pg";
import { DevconnectPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Updates a pretix ticket in our database.
 */
export async function updateDevconnectPretixTicket(
  client: Pool,
  params: DevconnectPretixTicket
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
update devconnect_pretix_ticket
set ticket_name=$2, event_id=$3, name=$4
where email=$1;`,
    [params.email, params.ticket_name, params.event_id, params.name]
  );
  return result.rowCount;
}
