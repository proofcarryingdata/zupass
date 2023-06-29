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

/**
 * Fetches all the identity commitments and their associated user ids
 * from the database. This is basically the list of people who have
 * logged in and have not been kicked out in any way.
 */
export async function fetchAllCommitments(
  client: Pool | ClientBase
): Promise<CommitmentRow[]> {
  const result = await sqlQuery(client, `select * from commitments`);
  return result.rows;
}
