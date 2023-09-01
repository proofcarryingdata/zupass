import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface CacheEntry {
  cache_key: string;
  cache_value: string;
  time_created: Date;
  time_updated: Date;
}

export async function setCacheValue(
  db: Pool,
  key: string,
  value: string
): Promise<void> {
  await sqlQuery(
    db,
    `
insert into cache(
  cache_key,
  cache_value,
  time_created,
  time_updated)
values ($1, $2, NOW(), NOW()) 
on conflict(cache_key) do update 
set cache_value = $2,
time_updated = NOW();`,
    [key, value]
  );
}

export async function getCacheValue(
  db: Pool,
  key: string
): Promise<CacheEntry | undefined> {
  const result = await sqlQuery(
    db,
    `select * from cache where cache_key = $1`,
    [key]
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return result.rows[0];
}
