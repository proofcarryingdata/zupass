import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";
import { sqlQuery } from "../sqlQuery";

/**
 * Saves a new user. If a user with the given email already exists, overwrites their
 * information. Returns the user's UUID.
 */
export async function upsertUser(
  client: Pool,
  params: {
    email: string;
    commitment: string;
    salt?: string | null;
    encryptionKey?: string;
    terms_agreed: number;
    extra_issuance: boolean;
  }
): Promise<string> {
  const {
    email,
    commitment,
    salt,
    encryptionKey,
    terms_agreed,
    extra_issuance
  } = params;

  logger(
    `Saving user email=${email} commitment=${commitment} ` +
      `salt=${salt} encryption_key=${encryptionKey} ` +
      `terms_agreed=${terms_agreed} extra_issuance=${extra_issuance}`
  );

  const insertResult = await sqlQuery(
    client,
    `\
INSERT INTO users (uuid, email, commitment, salt, encryption_key, terms_agreed, extra_issuance)
VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
ON CONFLICT (email) DO UPDATE SET 
commitment = $2, salt = $3, encryption_key = $4, terms_agreed = $5, extra_issuance=$6`,
    [email, commitment, salt, encryptionKey, terms_agreed, extra_issuance]
  );
  const uuidResult = await sqlQuery(
    client,
    `\
SELECT uuid FROM users
WHERE email = $1 AND commitment = $2`,
    [email, commitment]
  );
  const uuid = uuidResult.rows[0]?.uuid as string | undefined;
  if (uuid == null) {
    throw new Error(
      `Failed to save commitment. Wrong email? ${email} ${commitment} ${salt} ${encryptionKey}`
    );
  }

  const stat = insertResult.rowCount === 1 ? "NEW" : "EXISTING";
  logger(
    `Saved. email=${email} commitment=${commitment} salt=${salt} encryption_key=${encryptionKey} has ${stat} uuid=${uuid}`
  );
  return uuid;
}
