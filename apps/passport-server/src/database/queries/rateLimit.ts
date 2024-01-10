import { Pool } from "postgres-pool";
import { RateLimitBucketDB } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Delete multiple rate limiting buckets.
 */
export async function deleteRateLimitBuckets(
  client: Pool,
  actionType: string,
  actionIds: string[]
): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM rate_limit_buckets WHERE action_type = $1 AND action_id = ANY($2)`,
    [actionType, actionIds]
  );
}

/**
 * Fetch all rate limit buckets.
 */
export async function fetchRateLimitBuckets(
  client: Pool
): Promise<RateLimitBucketDB[]> {
  const result = await sqlQuery(client, `SELECT * FROM rate_limit_buckets`);
  return result.rows;
}

/**
 * Insert or update a rate limit bucket.
 */
export async function saveRateLimitBucket(
  client: Pool,
  actionType: string,
  actionId: string,
  remaining: number,
  expiryTime: number
): Promise<void> {
  await sqlQuery(
    client,
    `
    INSERT INTO rate_limit_buckets (action_type, action_id, remaining, expiry_time)
    VALUES($1, $2, $3, $4)
    ON CONFLICT (action_type, action_id) DO
    UPDATE SET action_type = $1, action_id = $2, remaining = $3, expiry_time = $4`,
    [actionType, actionId, remaining, new Date(expiryTime)]
  );
}
