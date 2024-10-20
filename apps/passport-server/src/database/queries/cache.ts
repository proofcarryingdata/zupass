import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface CacheEntry {
  cache_key: string;
  cache_value: string;
  time_created: Date;
  time_updated: Date;
}

export async function setCacheValue(
  client: PoolClient,
  key: string,
  value: string
): Promise<CacheEntry> {
  const result = await sqlQuery(
    client,
    `
insert into cache(
  cache_key,
  cache_value,
  time_created,
  time_updated)
values ($1, $2, NOW(), NOW()) 
on conflict(cache_key) do update 
set cache_value = $2,
time_updated = NOW()
returning *;`,
    [key, value]
  );

  return result.rows[0];
}

export async function getCacheValue(
  client: PoolClient,
  key: string
): Promise<CacheEntry | undefined> {
  const result = await sqlQuery(
    client,
    `select * from cache where cache_key = $1`,
    [key]
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return result.rows[0];
}

export async function getCacheSize(client: PoolClient): Promise<number> {
  const result = await sqlQuery(client, `select count(*) from cache;`);
  return parseInt(result.rows[0].count);
}

/**
 * This function prevents unbounded growth of the cache table.
 *
 * Deletes entries from the cache that are
 * - either older than {@link maxAgeInDays}
 * - or not one of the first {@link maxEntries} entries in the cache table
 * @returns the amount of entries deleted
 */
export async function deleteExpiredCacheEntries(
  client: PoolClient,
  maxAgeInDays: number,
  maxEntries: number
): Promise<number> {
  const result = await sqlQuery(
    client,
    `
with deleted as (
  with nonExpired as (
    select * from cache
    where time_created > NOW() - $1 * (interval '1 day')
    order by id desc
    limit $2
  )
  delete from cache
  where id < (select min(nonExpired.id) from nonExpired)
  returning *
)
select count(*) as deleted_count from deleted;
  `,
    [maxAgeInDays, maxEntries]
  );

  return parseInt(result.rows[0].deleted_count, 10);
}
