import { PoolClient } from "postgres-pool";
import { ZuzaluPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a zuzalu pretix ticket into the database, if they have not been
 * inserted yet. This does not insert an identity commitment for them.
 */
export async function insertZuzaluPretixTicket(
  client: PoolClient,
  params: ZuzaluPretixTicket
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
insert into zuzalu_pretix_tickets (email, name, role, order_id, visitor_date_ranges)
values ($1, $2, $3, $4, $5)
on conflict do nothing;`,
    [
      params.email,
      params.name,
      params.role,
      params.order_id,
      params.visitor_date_ranges === undefined
        ? undefined
        : JSON.stringify(params.visitor_date_ranges)
    ]
  );
  return result.rowCount;
}
