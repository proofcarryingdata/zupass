import { Pool } from "postgres-pool";
import { sqlQuery, sqlQueryWithPool } from "../../src/database/sqlQuery";

/**
 * Deletes the rate limit buckets, resetting all rate limits.
 */
export async function resetRateLimitBuckets(pool: Pool): Promise<void> {
  await sqlQueryWithPool(pool, (client) =>
    sqlQuery(client, "DELETE FROM rate_limit_buckets")
  );
}
