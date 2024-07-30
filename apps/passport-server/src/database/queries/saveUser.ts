import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";
import { UserRow } from "../models";
import { sqlQuery, sqlTransaction } from "../sqlQuery";

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
ON CONFLICT (email) do update set
uuid = $1,
commitment = $2,
salt = $4,
extra_issuance = $5,
encryption_key = $6,
terms_agreed = $7,
time_updated = now();
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
    uuid: string;
    commitment: string;
    salt?: string | null;
    encryptionKey?: string;
    terms_agreed: number;
    extra_issuance: boolean;
    emails: string[];
  }
): Promise<string> {
  return sqlTransaction(client, "save user", async (client) => {
    const {
      commitment,
      salt,
      encryptionKey,
      terms_agreed,
      extra_issuance,
      uuid,
      emails
    } = params;

    logger(`Saving user ${JSON.stringify(params, null, 2)}`);

    const insertResult = await sqlQuery(
      client,
      `\
INSERT INTO users (uuid, commitment, salt, encryption_key, terms_agreed, extra_issuance)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (uuid) DO UPDATE SET 
commitment = $2, salt = $3, encryption_key = $4, terms_agreed = $5, extra_issuance=$6, time_updated=$7
returning *`,
      [
        uuid,
        commitment,
        salt,
        encryptionKey,
        terms_agreed,
        extra_issuance,
        new Date()
      ]
    );

    // Update the user's associated emails
    await sqlQuery(client, `DELETE FROM user_emails WHERE user_id = $1`, [
      uuid
    ]);

    if (emails.length > 0) {
      const emailValues = emails
        .map((_, index) => `($1, $${index + 2})`)
        .join(", ");
      await sqlQuery(
        client,
        `INSERT INTO user_emails (user_id, email) VALUES ${emailValues}`,
        [uuid, ...emails]
      );
    }

    const user = insertResult.rows[0];

    if (!user) {
      throw new Error(`Failed to save user.`);
    }

    return uuid;
  });
}
