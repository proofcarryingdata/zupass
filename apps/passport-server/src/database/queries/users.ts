import { VerifiedCredential } from "@pcd/passport-interface";
import { PoolClient } from "postgres-pool";
import { UserRow } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches the identity commitment row corresponding to a particular
 * email from the database.
 */
export async function fetchUserByEmail(
  client: PoolClient,
  email: string
): Promise<UserRow | null> {
  const result = await sqlQuery(
    client,
    `SELECT u.*, array_agg(ue.email) as emails FROM users u
     JOIN user_emails ue ON u.uuid = ue.user_id
     WHERE ue.email = $1
     GROUP BY u.uuid`,
    [email]
  );

  return result.rows[0] || null;
}

/**
 * Fetches the user row corresponding to a particular uuid from the database.
 */
export async function fetchUserByUUID(
  client: PoolClient,
  uuid: string
): Promise<UserRow | null> {
  const result = await sqlQuery(
    client,
    `SELECT u.*, array_agg(ue.email) as emails
     FROM users u
     LEFT JOIN user_emails ue ON u.uuid = ue.user_id
     WHERE u.uuid = $1
     GROUP BY u.uuid`,
    [uuid]
  );

  return result.rows[0] || null;
}

/**
 * Fetches all the users from the database.
 */
export async function fetchAllUsers(client: PoolClient): Promise<UserRow[]> {
  const result = await sqlQuery(
    client,
    `SELECT u.*, array_agg(ue.email) as emails
     FROM users u
     LEFT JOIN user_emails ue ON u.uuid = ue.user_id
     GROUP BY u.uuid`
  );
  return result.rows;
}

/**
 * Deletes a user. This also logs them out on the client-side, when the client
 * next tries to refresh the user, which happens every page reload, and also
 * on an interval.
 */
export async function deleteUserByEmail(
  client: PoolClient,
  email: string
): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM users WHERE uuid IN (
      SELECT user_id FROM user_emails WHERE email = $1
    )`,
    [email]
  );
}

/**
 * Deletes a user by their UUID. This also logs them out on the client-side, when the client
 * next tries to refresh the user, which happens every page reload, and also
 * on an interval.
 */
export async function deleteUserByUUID(
  client: PoolClient,
  uuid: string
): Promise<void> {
  await sqlQuery(client, `DELETE FROM users WHERE uuid = $1`, [uuid]);
}

/**
 * Fetches the quantity of users.
 */
export async function fetchUserCount(client: PoolClient): Promise<number> {
  const result = await sqlQuery(client, "SELECT COUNT(*) AS count FROM users");
  return parseInt(result.rows[0].count, 10);
}

/**
 * Fetches a user given a verified credential.
 */
export async function fetchUserForCredential(
  client: PoolClient,
  credential?: VerifiedCredential | null
): Promise<UserRow | null> {
  if (!credential) {
    return null;
  }

  return fetchUserByV3Commitment(client, credential.semaphoreId);
}

/**
 * Fetches a user by their semaphore v3 commitment.
 */
export async function fetchUserByV3Commitment(
  client: PoolClient,
  v3Commitment: string
): Promise<UserRow | null> {
  const result = await sqlQuery(
    client,
    `SELECT u.*, array_agg(ue.email) as emails
     FROM users u
     LEFT JOIN user_emails ue ON u.uuid = ue.user_id
     WHERE u.commitment = $1
     GROUP BY u.uuid`,
    [v3Commitment]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Fetches a user by their semaphore v4 commitment.
 */
export async function fetchUserByV4Commitment(
  client: PoolClient,
  v4Commitment: string
): Promise<UserRow | null> {
  const result = await sqlQuery(
    client,
    `SELECT u.*, array_agg(ue.email) as emails
     FROM users u
     LEFT JOIN user_emails ue ON u.uuid = ue.user_id
     WHERE u.semaphore_v4_commitment = $1
     GROUP BY u.uuid`,
    [v4Commitment]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Fetches users who have agreed to minimum legal terms.
 */
export async function fetchUsersByMinimumAgreedTerms(
  client: PoolClient,
  version: number
): Promise<UserRow[]> {
  const result = await sqlQuery(
    client,
    `SELECT u.*, array_agg(ue.email) as emails
     FROM users u
     LEFT JOIN user_emails ue ON u.uuid = ue.user_id
     WHERE u.terms_agreed >= $1
     GROUP BY u.uuid`,
    [version]
  );

  return result.rows;
}

/**
 * Fetch all users with Devconnect tickets
 */
export async function fetchAllUsersWithDevconnectTickets(
  client: PoolClient
): Promise<UserRow[]> {
  const result = await sqlQuery(
    client,
    `
    SELECT u.*, array_agg(ue.email) as emails
    FROM users u
    INNER JOIN user_emails ue ON u.uuid = ue.user_id
    INNER JOIN devconnect_pretix_tickets t ON ue.email = t.email
    WHERE t.is_deleted = false
    GROUP BY u.uuid
    `
  );

  return result.rows;
}

/**
 * Fetch all users with superuser Devconnect tickets
 */
export async function fetchAllUsersWithDevconnectSuperuserTickets(
  client: PoolClient
): Promise<UserRow[]> {
  const result = await sqlQuery(
    client,
    `
    SELECT u.*, array_agg(ue.email) as emails
    FROM users u
    INNER JOIN user_emails ue ON u.uuid = ue.user_id
    INNER JOIN devconnect_pretix_tickets t ON ue.email = t.email
    INNER JOIN devconnect_pretix_items_info i ON t.devconnect_pretix_items_info_id = i.id
    INNER JOIN devconnect_pretix_events_info e ON i.devconnect_pretix_events_info_id = e.id
    INNER JOIN pretix_events_config ec ON e.pretix_events_config_id = ec.id
    WHERE t.is_deleted = false AND i.item_id = ANY(ec.superuser_item_ids)
    GROUP BY u.uuid
    `
  );

  return result.rows;
}
