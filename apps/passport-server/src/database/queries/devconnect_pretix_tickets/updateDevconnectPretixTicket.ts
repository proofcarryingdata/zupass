import { Pool } from "pg";
import { DevconnectPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Updates a pretix ticket in our database.
 */
export async function updateDevconnectPretixTicket(
  client: Pool,
  params: DevconnectPretixTicket
): Promise<DevconnectPretixTicket> {
  const result = await sqlQuery(
    client,
    `\
update devconnect_pretix_tickets
set full_name=$1, is_deleted=$2
where position_id=$3
returning *`,
    [params.full_name, params.is_deleted, params.position_id]
  );
  return result.rows[0];
}

/**
 * Updates a non-deleted, unconsumed pretix ticket in our database
 * to toggle on `is_consumed` state, returning the row if it exists.
 */
export async function consumeDevconnectPretixTicket(
  client: Pool,
  id: number
): Promise<boolean> {
  const result = await sqlQuery(
    client,
    `update devconnect_pretix_tickets
    set is_consumed=TRUE
    where id=$1 and is_deleted=FALSE and is_consumed=FALSE
    returning id`,
    [id]
  );
  return result.rowCount === 1;
}
