import { Rarity } from "@pcd/eddsa-frog-pcd";
import {
  DexFrog,
  FrogCryptoDbFeedData,
  FrogCryptoDbFrogData,
  FrogCryptoFeed,
  FrogCryptoFeedBiomeConfigs,
  FrogCryptoFolderName,
  FrogCryptoFrogData,
  FrogCryptoScore
} from "@pcd/passport-interface";
import { PCDPermissionType } from "@pcd/pcd-collection";
import _ from "lodash";
import { Client } from "pg";
import { Pool } from "postgres-pool";
import { parseFrogEnum } from "../../util/frogcrypto";
import { FrogCryptoUserFeedState } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches state of all feeds for a particular user.
 */
export async function fetchUserFeedsState(
  client: Pool,
  semaphoreId: string
): Promise<FrogCryptoUserFeedState[]> {
  const result = await sqlQuery(
    client,
    `select * from frogcrypto_user_feeds where semaphore_id = $1`,
    [semaphoreId]
  );

  return result.rows;
}

/**
 * Ensure that a user has a feed specific row which we can acquire lock for.
 *
 * NB: This must run before transaction begins to ensure there is a lock TX can acquire and avoid deadlocks.
 */
export async function initializeUserFeedState(
  client: Pool,
  semaphoreId: string,
  feedId: string
): Promise<void> {
  await sqlQuery(
    client,
    `insert into frogcrypto_user_feeds
    (semaphore_id, feed_id) values ($1, $2)
    on conflict (semaphore_id, feed_id) do nothing`,
    [semaphoreId, feedId]
  );
}

/**
 * Update the last time a user has polled a feed.
 *
 * The primary invariant of this query is that the user state is updated
 * atomically:
 * - Last fetched timestamp is updated if and only if user is eligible to fetch
 *   a frog and ended up issued a frog.
 * - Any concurrent requests must process in sequence and will not deadlock.
 *
 * This query should be used in a transaction where the server can perform
 * additional logic or queries based on the user state returned by this query.
 * Ther server should only COMMIT the transaction at the end of these
 * operations. This ensures that the user state update is automatically rolled
 * back in case of error.
 *
 * This query uses `SELECT FOR UPDATE NOWAIT` to acquire a lock on the row. If
 * the row is already locked by another transaction, this query will throw an
 * error. This ensures any concurrent transactions will not deadlock on this row
 * or read and exploit stale data.
 *
 * - If `NOWAIT` is not specified, a second query could wait for the lock to be
 *   released until timeout. This doesn't hurt correctness but due to the
 *   cooldown mechanics, it is unlikely that the second query will be able to
 *   fetch a frog.
 * - If `SELECT FOR UPDATE` is not specified, the row will only be locked when
 *   transactions are committed in sequence. As is, the query will return stale
 *   data and makes the concurent request eligible for double issuance. Instead,
 *   we would have to codify "compare and set" logic in the query, which is more
 *   error prone and complicated. We need to first fetch the old value, then
 *   update the row only if the old value still matches the expected value. This
 *   requires two queries and additional logic in the case of bail.
 *
 * Note the seemingly complicated situation is due to:
 * - Our issuing logic requires use of Transaction for easy rollback.
 * - Our cooldown logic requires atomic update where row-level locks is one of
 *   the easiest and more robust solutions.
 *
 * @returns the old last_fetched_at value or undefined if the row was not found.
 */
export async function updateUserFeedState(
  client: Client,
  semaphoreId: string,
  feedId: string,
  /**
   *  can be used to reset cooldown to give a free roll
   */
  lastFetchedAt: string = new Date().toUTCString()
): Promise<Date | undefined> {
  const result = await client.query(
    `
    update frogcrypto_user_feeds new
    set last_fetched_at = $3
    from (select * from frogcrypto_user_feeds where semaphore_id = $1 and feed_id = $2 for update nowait) old
    where old.id = new.id
    returning old.last_fetched_at
    `,
    [semaphoreId, feedId, lastFetchedAt]
  );

  return result.rows[0]?.last_fetched_at;
}

/**
 * Upsert frog data into the database.
 */
export async function upsertFrogData(
  client: Pool,
  frogDataList: FrogCryptoFrogData[]
): Promise<void> {
  for (const frogData of frogDataList) {
    await sqlQuery(
      client,
      `insert into frogcrypto_frogs
    (id, uuid, frog)
    values ($1, $2, $3)
    on conflict (id) do update
    set uuid = $2, frog = $3
    `,
      [frogData.id, frogData.uuid, _.omit(frogData, ["id", "uuid"])]
    );
  }
}

/**
 * Returns all the frogs in the database.
 */
export async function getFrogData(pool: Pool): Promise<FrogCryptoFrogData[]> {
  const result = await sqlQuery(
    pool,
    `select * from frogcrypto_frogs order by id`
  );

  return result.rows.map(toFrogData);
}

/**
 * Delete frog data from the database by ids.
 */
export async function deleteFrogData(
  pool: Pool,
  frogIds: number[]
): Promise<void> {
  await sqlQuery(
    pool,
    `delete from frogcrypto_frogs where id = any($1::int[])`,
    [frogIds]
  );
}

/**
 * Returns a list of possible frogs
 */
export async function getPossibleFrogs(pool: Pool): Promise<DexFrog[]> {
  const result = await sqlQuery(
    pool,
    `
  select id, frog->>'rarity' as rarity
  from frogcrypto_frogs
  where frog->>'rarity' <> 'object'
  order by id
    `
  );

  return result.rows.map((row) => ({
    id: parseInt(row.id),
    rarity: parseFrogEnum(Rarity, row.rarity)
  }));
}

/**
 * Sample a single frog based on drop_weight scaled by biome specific scaling factor.
 *
 * https://utopia.duth.gr/~pefraimi/research/data/2007EncOfAlg.pdf
 */
export async function sampleFrogData(
  pool: Pool,
  biomes: FrogCryptoFeedBiomeConfigs
): Promise<FrogCryptoFrogData | undefined> {
  const [biomeKeys, scalingFactors] = _.chain(biomes)
    .toPairs()
    .map(([biome, config]) => [biome, config?.dropWeightScaler])
    .filter(([, scalingFactor]) => !!scalingFactor)
    .unzip()
    .value();

  const result = await sqlQuery(
    pool,
    `
    with biome_scaling as (
      select unnest($1::text[]) as biome, unnest($2::float[]) as scaling_factor
    )

    select * from frogcrypto_frogs
    join biome_scaling on replace(lower(frog->>'biome'), ' ', '') = lower(biome_scaling.biome)

    order by
    -- prevent underflow
    random() ^ least(1.0 / cast(frog->>'drop_weight' as double precision) / scaling_factor, 10)
    desc

    limit 1`,
    [biomeKeys, scalingFactors]
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return toFrogData(result.rows[0]);
}

function toFrogData(dbFrogData: FrogCryptoDbFrogData): FrogCryptoFrogData {
  return {
    id: dbFrogData.id,
    uuid: dbFrogData.uuid,
    ...dbFrogData.frog
  };
}

export async function incrementScore(
  client: Client,
  semaphoreId: string,
  increment = 1
): Promise<FrogCryptoScore> {
  const res = await client.query(
    `insert into frogcrypto_user_scores
    (semaphore_id, score)
    values ($1, $2)
    on conflict (semaphore_id) do update set score = frogcrypto_user_scores.score + $2
    returning *`,
    [semaphoreId, increment]
  );

  return res.rows[0];
}

export async function getScoreboard(
  pool: Pool,
  limit = 50
): Promise<FrogCryptoScore[]> {
  const result = await sqlQuery(
    pool,
    `select
    cast(score as int) as score,
    cast(rank as int) as rank,
    semaphore_id
    from (
      select *, rank() over (order by score desc) from frogcrypto_user_scores
      order by score desc
      limit $1
    ) scores
    order by rank asc`,
    [limit]
  );

  return result.rows;
}

/**
 * Upsert feed data into the database.
 */
export async function upsertFeedData(
  client: Pool,
  feedDataList: FrogCryptoDbFeedData[]
): Promise<void> {
  for (const feedData of feedDataList) {
    await sqlQuery(
      client,
      `insert into frogcrypto_feeds
    (uuid, feed)
    values ($1, $2)
    on conflict (uuid) do update
    set feed = $2
    `,
      [feedData.uuid, feedData.feed]
    );
  }
}

/**
 * Returns all the raw feeds in the database.
 */
export async function getRawFeedData(
  pool: Pool
): Promise<FrogCryptoDbFeedData[]> {
  const result = await sqlQuery(pool, `select * from frogcrypto_feeds`);

  return result.rows;
}

export async function getUserScore(
  pool: Pool,
  semaphoreId: string
): Promise<FrogCryptoScore | undefined> {
  const result = await sqlQuery(
    pool,
    `select
    cast(score as int) as score,
    cast(rank as int) as rank,
    semaphore_id
    from (
      select *, rank() over (order by score desc) from frogcrypto_user_scores
    ) scores
    where semaphore_id = $1`,
    [semaphoreId]
  );

  return result.rows[0];
}

/**
 * Returns all the feeds in the database.
 */
export async function getFeedData(pool: Pool): Promise<FrogCryptoFeed[]> {
  return (await getRawFeedData(pool)).map(toFeedData);
}

function toFeedData(dbFeedData: FrogCryptoDbFeedData): FrogCryptoFeed {
  return {
    // hydrate with default values
    autoPoll: false,
    inputPCDType: undefined,
    partialArgs: undefined,
    credentialRequest: {
      signatureType: "sempahore-signature-pcd"
    },
    permissions: [
      {
        folder: FrogCryptoFolderName,
        type: PCDPermissionType.AppendToFolder
      }
    ],
    ...dbFeedData.feed,
    id: dbFeedData.uuid
  };
}
