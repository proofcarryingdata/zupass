import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export async function setCacheValue(
  db: Pool,
  key: string,
  value: string
): Promise<void> {
  await sqlQuery(
    db,
    `insert into cache values ($1, $2) on conflict(cache_key) do update set cache_value = $2`,
    [key, value]
  );
}

export async function getCacheValue(
  db: Pool,
  key: string
): Promise<string | undefined> {
  const result = await sqlQuery(
    db,
    `select * from cache where cache_key = $1`,
    [key]
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return result.rows[0].cache_value;
}
