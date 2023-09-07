import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";
import { sqlQuery } from "../sqlQuery";

/**
 * Saves a new commitment. Overwrites any existing commitment for this email.
 * Returns the commitment UUID. Works for both Zupass users and PCDpass users.
 */
export async function insertCommitment(
  client: Pool,
  params: {
    email: string;
    commitment: string;
    salt?: string;
  }
): Promise<string> {
  const { email, commitment, salt } = params;
  logger(
    `Saving commitment email=${email} commitment=${commitment} salt=${salt}`
  );

  const insertResult = await sqlQuery(
    client,
    `\
INSERT INTO commitments (uuid, email, commitment, salt)
VALUES (gen_random_uuid(), $1, $2, $3)
ON CONFLICT (email) DO UPDATE SET commitment = $2, salt = $3`,
    [email, commitment, salt]
  );
  const uuidResult = await sqlQuery(
    client,
    `\
SELECT uuid FROM commitments
WHERE email = $1 AND commitment = $2`,
    [email, commitment]
  );
  const uuid = uuidResult.rows[0]?.uuid as string | undefined;
  if (uuid == null) {
    throw new Error(
      `Failed to save commitment. Wrong email? ${email} ${commitment} ${salt}`
    );
  }

  const stat = insertResult.rowCount === 1 ? "NEW" : "EXISTING";
  logger(
    `Saved. email=${email} commitment=${commitment} salt=${salt} has ${stat} uuid=${uuid}`
  );
  return uuid;
}
