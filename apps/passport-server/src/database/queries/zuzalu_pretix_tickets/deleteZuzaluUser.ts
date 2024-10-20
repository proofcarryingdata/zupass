import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete a particular user that has a ticket in pretix, and also their
 * identity commitment, if they have logged into the passport.
 */
export async function deleteZuzaluTicket(
  client: PoolClient,
  email: string
): Promise<void> {
  await sqlQuery(client, `delete from zuzalu_pretix_tickets where email = $1`, [
    email
  ]);
}
