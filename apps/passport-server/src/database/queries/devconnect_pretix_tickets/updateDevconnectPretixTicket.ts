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
update devconnect_pretix_tickets
set item_ids=$4, name=$5
where email=$1 and event_id=$2 and organizer_url=$3;`,
    [
      params.email,
      params.event_id,
      params.organizer_url,
      params.item_ids,
      params.name,
    ]
  );
  return result.rowCount;
}
