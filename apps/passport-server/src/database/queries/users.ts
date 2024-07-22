import { Pool } from "postgres-pool";
import { UserRow } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches the identity commitment row corresponding to a particular
 * email from the database.
 */
export async function fetchUserByEmail(
  client: Pool,
  email: string
): Promise<UserRow | null> {
  const result = await sqlQuery(
    client,
    `select * from users where email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

/**
 * Fetches the user row corresponding to a particular uuid from the database.
 */
export async function fetchUserByUUID(
  client: Pool,
  uuid: string
): Promise<UserRow | null> {
  const result = await sqlQuery(client, `select * from users where uuid = $1`, [
    uuid
  ]);

  return result.rows[0] || null;
}

/**
 * Fetches the user row corresponding to a particular auth_key from the database.
 */
export async function fetchUserByAuthKey(
  client: Pool,
  authKey: string
): Promise<UserRow | null> {
  const result = await sqlQuery(
    client,
    `select * from users where auth_key = $1`,
    [authKey]
  );

  return result.rows[0] || null;
}

/**
 * Fetches all the users from the database.
 */
export async function fetchAllUsers(client: Pool): Promise<UserRow[]> {
  const result = await sqlQuery(client, `select * from users`);
  return result.rows;
}

/**
 * Deletes a user. This also logs them out on the client-side, when the client
 * next tries to refresh the user, which happens every page reload, and also
 * on an interval.
 */
export async function deleteUserByEmail(
  client: Pool,
  email: string
): Promise<void> {
  await sqlQuery(client, "delete from users where email = $1", [email]);
}

/**
 * Fetches the quantity of users.
 */
export async function fetchUserCount(client: Pool): Promise<number> {
  const result = await sqlQuery(client, "select count(*) as count from users");
  return parseInt(result.rows[0].count, 10);
}

/**
 * Fetches a user by their semaphore commitment.
 */
export async function fetchUserByCommitment(
  client: Pool,
  commitment: string
): Promise<UserRow | null> {
  const result = await sqlQuery(
    client,
    `\
  select * from users
  where commitment = $1;
   `,
    [commitment]
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
  client: Pool,
  version: number
): Promise<UserRow[]> {
  const result = await sqlQuery(
    client,
    `\
    SELECT * FROM users WHERE terms_agreed >= $1`,
    [version]
  );

  return result.rows;
}

/**
 * Fetch all users with Devconnect tickets
 */
export async function fetchAllUsersWithDevconnectTickets(
  client: Pool
): Promise<UserRow[]> {
  const result = await sqlQuery(
    client,
    `
  SELECT u.* FROM users u
  INNER JOIN devconnect_pretix_tickets t
  ON u.email = t.email
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
  client: Pool
): Promise<UserRow[]> {
  const result = await sqlQuery(
    client,
    `
  SELECT u.* FROM users u
  INNER JOIN devconnect_pretix_tickets t
  ON u.email = t.email
  INNER JOIN devconnect_pretix_items_info i ON t.devconnect_pretix_items_info_id = i.id
  INNER JOIN devconnect_pretix_events_info e ON i.devconnect_pretix_events_info_id = e.id
  INNER JOIN pretix_events_config ec ON e.pretix_events_config_id = ec.id
  WHERE t.is_deleted = false AND i.item_id = ANY(ec.superuser_item_ids)
  GROUP BY u.uuid
  `
  );

  return result.rows;
}
