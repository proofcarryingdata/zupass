import { Pool } from "pg";
import { DevconnectPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a Devconnect pretix ticket into the database, if they have not been
 * inserted yet. This does not insert an identity commitment for them.
 */
export async function insertDevconnectPretixTicket(
  client: Pool,
  params: DevconnectPretixTicket
): Promise<DevconnectPretixTicket> {
  const result = await sqlQuery(
    client,
    `\
insert into devconnect_pretix_tickets
(email, full_name, devconnect_pretix_items_info_id, is_deleted, is_consumed, position_id)
values ($1, $2, $3, $4, $5, $6)
on conflict do nothing
returning *`,
    [
      params.email,
      params.full_name,
      params.devconnect_pretix_items_info_id,
      params.is_deleted,
      params.is_consumed,
      params.position_id
    ]
  );
  return result.rows[0];
}
