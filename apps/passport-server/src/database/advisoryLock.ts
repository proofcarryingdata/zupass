import { createHash } from "crypto";
import { Pool } from "postgres-pool";
import { sqlQuery } from "./sqlQuery";

/**
 * Hashes a string using SHA256 and converts it to a 64-bit integer.
 * @param input The string to be hashed.
 * @returns A string representation of the 64-bit integer.
 */
export function hashToInt64(input: string): string {
  // Create a SHA256 hash of the input string
  const hash = createHash("sha256").update(input).digest();

  // Take the first 8 bytes (64 bits) of the hash
  const int64Buffer = Buffer.alloc(8);
  hash.copy(int64Buffer, 0, 0, 8);

  // Convert the buffer to a BigInt
  const int64 = BigInt(`0x${int64Buffer.toString("hex")}`);

  // Return the BigInt as a string
  return int64.toString();
}

export async function acquireAdvisoryLock(
  pool: Pool,
  lockName: string
): Promise<boolean> {
  const lockInt = hashToInt64(lockName);
  const res = await sqlQuery(pool, `SELECT pg_advisory_lock($1)`, [lockInt]);
  return res.rows[0].pg_advisory_unlock;
}

export async function releaseAdvisoryLock(
  pool: Pool,
  lockName: string
): Promise<boolean> {
  const lockInt = hashToInt64(lockName);
  const res = await sqlQuery(pool, `SELECT pg_advisory_unlock($1)`, [lockInt]);
  return res.rows[0].pg_advisory_unlock;
}
