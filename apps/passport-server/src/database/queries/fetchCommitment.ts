import { ClientBase, Pool } from "pg";
import { CommitmentRow } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches the identity commitment row corresponding to a particular
 * email from the database. Works for both Zupass users and PCDPass
 * users.
 */
export async function fetchCommitment(
  client: ClientBase | Pool,
  email: string
): Promise<CommitmentRow | null> {
  const result = await sqlQuery(
    client,
    `select * from commitments where email = $1`,
    [email]
  );

  return result.rows[0] || null;
}
