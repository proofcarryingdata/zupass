import { Pool } from "pg";
import { CommitmentRow } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches the identity commitment row corresponding to a particular
 * email from the database. Works for both Zupass users and PCDPass
 * users.
 */
export async function fetchCommitment(
  client: Pool,
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
  client: Pool
): Promise<CommitmentRow[]> {
  const result = await sqlQuery(client, `select * from commitments`);
  return result.rows;
}

/**
 * Deletes a commitment. For zuzalu users, this effectively logs them out of
 * the passport app, though they are able to log in again. For non-zuzalu users,
 * this also logs them out.
 */
export async function removeCommitment(
  client: Pool,
  email: string
): Promise<void> {
  await sqlQuery(client, "delete from commitments where email = $1", [email]);
}

/**
 * Fetches the amount of commitments saved in the database.
 */
export async function fetchCommitmentsCount(client: Pool): Promise<number> {
  const result = await sqlQuery(
    client,
    "select count(*) as count from commitments"
  );
  return parseInt(result.rows[0].count, 10);
}
