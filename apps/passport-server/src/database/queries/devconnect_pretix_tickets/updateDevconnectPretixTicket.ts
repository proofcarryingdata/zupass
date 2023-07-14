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

export async function consumeDevconnectPretixTicket(
  client: Pool,
  id: string | undefined
): Promise<boolean> {
  const result = await sqlQuery(
    client,
    "update devconnect_pretix_tickets set is_consumed=TRUE where id=$1 and is_deleted = FALSE and is_consumed = FALSE returning id",
    [id]
  );
  return result.rowCount === 1;
}
