import { ClientBase, Pool } from "pg";
import { PretixParticipant } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Insert a ticketed participant from pretix into the database, if
 * they have not been inserted yet. This does not insert an identity
 * commitment for them.
 */
export async function insertPretixParticipant(
  client: ClientBase | Pool,
  params: PretixParticipant
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
        : JSON.stringify(params.visitor_date_ranges),
    ]
  );
  return result.rowCount;
}
