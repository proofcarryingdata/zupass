import { ClientBase, Pool } from "pg";
import { sqlQuery } from "../sqlQuery";

// Saves a new commitment. Overwrites any existing commitment for this email.
// Returns the commitment UUID.
export async function saveCommitment(
  client: ClientBase | Pool,
  params: {
    email: string;
    commitment: string;
  }
): Promise<string> {
  const { email, commitment } = params;
  console.log(`Saving commitment email=${email} commitment=${commitment}`);

  // Insert succeeds only if we already have a Pretix participant (but don't
  // already have a commitment) for this email--due to foreign + unique keys.
  const insertResult = await sqlQuery(
    client,
    `\
INSERT INTO commitments (uuid, participant_email, commitment)
VALUES (gen_random_uuid(), $1, $2)
ON CONFLICT (participant_email) DO UPDATE SET commitment = $2`,
    [email, commitment]
  );
  const uuidResult = await sqlQuery(
    client,
    `\
SELECT uuid FROM commitments
WHERE participant_email = $1 AND commitment = $2`,
    [email, commitment]
  );
  const uuid = uuidResult.rows[0]?.uuid as string | undefined;
  if (uuid == null) {
    throw new Error(
      `Failed to save commitment. Wrong email? ${email} ${commitment}`
    );
  }

  const stat = insertResult.rowCount === 1 ? "NEW" : "EXISTING";
  console.log(
    `Saved. email=${email} commitment=${commitment} has ${stat} uuid=${uuid}`
  );
  return uuid;
}
