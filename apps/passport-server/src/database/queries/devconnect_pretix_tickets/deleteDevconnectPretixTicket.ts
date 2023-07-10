import { Pool } from "pg";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete a particular user that has a ticket in pretix, and also their
 * identity commitment, if they have logged into the passport.
 */
export async function deleteDevconnectUser(
  client: Pool,
  email: string
): Promise<void> {
  await sqlQuery(
    client,
    `delete from devconnect_pretix_tickets where email = $1`,
    [email]
  );

  await sqlQuery(client, `delete from commitments where email = $1`, [email]);
}
