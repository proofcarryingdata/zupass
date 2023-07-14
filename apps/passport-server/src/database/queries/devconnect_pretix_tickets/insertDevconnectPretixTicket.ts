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
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into devconnect_pretix_tickets (email, full_name, devconnect_pretix_items_info_id, is_deleted)
values ($1, $2, $3, $4)
on conflict do nothing;`,
    [
      params.email,
      params.full_name,
      params.devconnect_pretix_items_info_id,
      params.is_deleted,
    ]
  );
  return result.rowCount;
}
