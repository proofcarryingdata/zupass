import { ClientBase, Pool } from "pg";
import { CommitmentRow } from "../models";
import { sqlQuery } from "../sqlQuery";

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
