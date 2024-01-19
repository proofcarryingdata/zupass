import { Pool } from "postgres-pool";
import { sqlQuery } from "../../src/database/sqlQuery";

/**
 * Deletes the rate limit buckets, resetting all rate limits.
 */
export async function resetRateLimitBuckets(db: Pool): Promise<void> {
  await sqlQuery(db, "DELETE FROM rate_limit_buckets");
}
