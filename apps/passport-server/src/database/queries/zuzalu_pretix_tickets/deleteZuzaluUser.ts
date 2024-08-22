import { Pool } from "postgres-pool";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete a particular user that has a ticket in pretix.
 */
export async function deleteZuzaluTicket(
  client: Pool,
  email: string
): Promise<void> {
  await sqlQuery(client, `delete from zuzalu_pretix_tickets where email = $1`, [
    email
  ]);
}
