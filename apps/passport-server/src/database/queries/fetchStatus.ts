import { ClientBase, Pool } from "pg";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches some status parameters based on the state of the database.
 */
export async function fetchStatus(client: ClientBase | Pool): Promise<{
  n_pretix_participants: number;
  n_commitments: number;
  n_e2ee: number;
}> {
  const result = await sqlQuery(
    client,
    `\
select 
    (select count(*) from pretix_participants) as n_pretix_participants,
    (select count(*) from commitments) as n_commitments,
    (select count(*) from e2ee) as n_e2ee
;`
  );
  return result.rows[0];
}
