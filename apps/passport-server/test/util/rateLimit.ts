import { Pool } from "postgres-pool";
import { sqlQuery, sqlTransaction } from "../../src/database/sqlQuery";

/**
 * Deletes the rate limit buckets, resetting all rate limits.
 */
export async function resetRateLimitBuckets(pool: Pool): Promise<void> {
  await sqlTransaction(pool, (client) =>
    sqlQuery(client, "DELETE FROM rate_limit_buckets")
  );
}
