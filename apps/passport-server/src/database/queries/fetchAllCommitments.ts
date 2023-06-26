import { ClientBase, Pool } from "pg";
import { CommitmentRow } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function fetchAllCommitments(
  client: Pool | ClientBase
): Promise<CommitmentRow[]> {
  const result = await sqlQuery(client, `select * from commitments`);
  return result.rows;
}
