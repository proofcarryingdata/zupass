import { ClientBase, Pool } from "pg";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches some status parameters based on the state of the database.
 */
export async function fetchStatus(client: ClientBase | Pool): Promise<{
  n_zuzalu_pretix_tickets: number;
  n_commitments: number;
  n_e2ee: number;
}> {
  const result = await sqlQuery(
    client,
    `\
select 
    (select count(*) from zuzalu_pretix_tickets) as n_zuzalu_pretix_tickets,
    (select count(*) from commitments) as n_commitments,
    (select count(*) from e2ee) as n_e2ee
;`
  );
  return result.rows[0];
}
