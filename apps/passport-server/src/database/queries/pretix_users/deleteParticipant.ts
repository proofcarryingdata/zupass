import { ClientBase, Pool } from "pg";
import { sqlQuery } from "../../sqlQuery";

/**
 * Delete a particular user that has a ticket in pretix, and also their
 * identity commitment, if they have logged into the passport.
 */
export async function deletePretixParticipant(
  client: ClientBase | Pool,
  email: string
): Promise<void> {
  await sqlQuery(client, `delete from pretix_participants where email = $1`, [
    email,
  ]);

  await sqlQuery(
    client,
    `delete from commitments where participant_email = $1`,
    [email]
  );
}
