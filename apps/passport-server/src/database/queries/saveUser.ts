import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";
import { UserRow } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function saveUserBackup(
  client: Pool,
  user: UserRow
): Promise<void> {
  logger(`saving user backup: ${JSON.stringify(user)}`);

  // INSERT INTO users (uuid, commitment, email, salt, extra_issuance, encryption_key, terms_agreed, time_created, time_updated)
  // SELECT uuid, commitment, email, salt, extra_issuance, encryption_key, terms_agreed, time_created, time_updated
  // FROM user_backups
  // on conflict (email) do update set
  // uuid = EXCLUDED.uuid,
  // commitment = EXCLUDED.commitment,
  // salt = EXCLUDED.salt,
  // extra_issuance = EXCLUDED.extra_issuance,
  // encryption_key = EXCLUDED.encryption_key,
  // terms_agreed = EXCLUDED.terms_agreed,
  // time_created = EXCLUDED.time_created,
  // time_updated = EXCLUDED.time_updated;

  // INSERT INTO users (uuid, commitment, email, salt, extra_issuance, encryption_key, terms_agreed, time_created, time_updated)
  // SELECT uuid, commitment, email, salt, extra_issuance, encryption_key, terms_agreed, time_created, time_updated
  // FROM user_backups
  // where email = 'ivan@0xparc.org'
  // on conflict (email) do update set
  // uuid = EXCLUDED.uuid,
  // commitment = EXCLUDED.commitment,
  // salt = EXCLUDED.salt,
  // extra_issuance = EXCLUDED.extra_issuance,
  // encryption_key = EXCLUDED.encryption_key,
  // terms_agreed = EXCLUDED.terms_agreed,
  // time_created = EXCLUDED.time_created,
  // time_updated = EXCLUDED.time_updated;

  await sqlQuery(
    client,
    `INSERT INTO user_backups (uuid, commitment, email, salt, extra_issuance, encryption_key, terms_agreed)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (email) DO NOTHING
  `,
    [
      user.uuid,
      user.commitment,
      user.email,
      user.salt,
      user.extra_issuance,
      user.encryption_key,
      user.terms_agreed
    ]
  );
}

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
commitment = $2, salt = $3, encryption_key = $4, terms_agreed = $5, extra_issuance=$6, time_updated=$7`,
    [
      email,
      commitment,
      salt,
      encryptionKey,
      terms_agreed,
      extra_issuance,
      new Date()
    ]
  );
  const uuidResult = await sqlQuery(
    client,
    `\
SELECT uuid FROM users
WHERE email = $1 AND commitment = $2`,
    [email, commitment]
  );
  const uuid = uuidResult.rows[0]?.uuid as string | undefined;
  if (!uuid) {
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
