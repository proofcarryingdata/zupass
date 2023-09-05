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
): Promise<CacheEntry> {
  const result = await sqlQuery(
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
time_updated = NOW()
returning *;`,
    [key, value]
  );

  return result.rows[0];
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

export async function getCacheSize(db: Pool): Promise<number> {
  const result = await sqlQuery(db, `select count(*) from cache;`);
  return parseInt(result.rows[0].count);
}

export async function deleteExpiredCacheEntries(
  db: Pool,
  maxAgeInDays: number,
  maxEntries: number
): Promise<number> {
  const result = await sqlQuery(
    db,
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
