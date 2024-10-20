import { PoolClient } from "postgres-pool";
import { ZuzaluPretixTicket } from "../../models";
import { sqlQuery } from "../../sqlQuery";

/**
 * Updates a pretix ticket in our database.
 */
export async function updateZuzaluPretixTicket(
  client: PoolClient,
  params: ZuzaluPretixTicket
): Promise<number> {
  const result = await sqlQuery(
    client,
    `\
update zuzalu_pretix_tickets
set role=$2, visitor_date_ranges=$3, name=$4
where email=$1;`,
    [
      params.email,
      params.role,
      params.visitor_date_ranges === undefined
        ? undefined
        : JSON.stringify(params.visitor_date_ranges),
      params.name
    ]
  );
  return result.rowCount;
}
