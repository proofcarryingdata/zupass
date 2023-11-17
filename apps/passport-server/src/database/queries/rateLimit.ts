import { Pool } from "postgres-pool";
import { RateLimit } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function checkRateLimit(
  client: Pool,
  eventType: RateLimit["type"],
  eventId: string
): Promise<boolean> {
  return (
    await sqlQuery(client, `SELECT take_token($1, $2)`, [eventType, eventId])
  ).rows[0].take_token;
}

export async function clearExpiredRateLimits(client: Pool): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM rate_limit_buckets WHERE last_refill < (NOW() - INTERVAL '1 HOUR')`
  );
}
