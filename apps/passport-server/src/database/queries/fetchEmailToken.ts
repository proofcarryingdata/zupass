import { ClientBase, Pool } from "pg";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches the token corresponding to a particular email address,
 * if we have sent them a token, null otherwise. Works for both
 * Zupass users and PCDPass users.
 */
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
