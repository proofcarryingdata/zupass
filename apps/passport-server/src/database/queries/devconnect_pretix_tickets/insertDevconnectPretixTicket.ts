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
insert into devconnect_pretix_tickets (email, name, ticket_name, order_id, event_id)
values ($1, $2, $3, $4, $5)
on conflict do nothing;`,
    [
      params.email,
      params.name,
      params.ticket_name,
      params.order_id,
      params.event_id,
    ]
  );
  return result.rowCount;
}
