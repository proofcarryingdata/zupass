import { ClientBase, Pool } from "pg";
import { sqlQuery } from "../sqlQuery";

export async function fetchEmailToken(
  client: Pool | ClientBase,
  email: string
): Promise<string | null> {
  const result = await sqlQuery(
    client,
    `select * from email_tokens where email = $1`,
    [email]
  );

  return result.rows[0].token || null;
}
