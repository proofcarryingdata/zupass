import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

/**
 * Calls the `take_token` stored procedure to determine if a "token" is
 * available. If so, the action is permitted, otherwise it is denied due to
 * exceeding the rate limit.
 *
 * See 58_rate_limit.sql
 *
 * @param client
 * @param actionType The type of action being attempted
 * @param actionId The identifier of this action
 * @returns Boolean indicating whether the action is permitted
 */
export async function checkRateLimit(
  client: Pool,
  actionType: string,
  actionId: string
): Promise<boolean> {
  return (
    await sqlQuery(client, `SELECT take_token($1, $2, $3)`, [
      actionType,
      actionId,
      new Date()
    ])
  ).rows[0].take_token;
}

/**
 * After one hour, it is no longer necessary to track actions for rate-limiting
 * purposes, so we can delete them.
 */
export async function clearExpiredActions(client: Pool): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM rate_limit_buckets WHERE last_refill <= ($1::timestamptz - INTERVAL '1 HOUR')`,
    [new Date()]
  );
}
