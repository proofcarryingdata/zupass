import { ClientBase, Pool } from "pg";
import { CommitmentRow } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function fetchCommitment(
  client: ClientBase | Pool,
  email: string
): Promise<CommitmentRow | null> {
  const result = await sqlQuery(
    client,
    `select * from commitments where participant_email = $1`,
    [email]
  );

  return result.rows[0] || null;
}
