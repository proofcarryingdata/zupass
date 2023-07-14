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
set full_name=$1, is_deleted=$2
where email=$3 and devconnect_pretix_items_info_id=$4`,
    [
      params.full_name,
      params.is_deleted,
      params.email,
      params.devconnect_pretix_items_info_id,
    ]
  );
  return result.rowCount;
}
