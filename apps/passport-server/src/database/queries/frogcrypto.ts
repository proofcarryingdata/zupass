import { Biome } from "@pcd/eddsa-frog-pcd";
import { FrogCryptoFrogData } from "@pcd/passport-interface/src/FrogCrypto";
import { Client } from "pg";
import { Pool } from "postgres-pool";
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
 * @returns the old last_fetched_at value or undefined if the row was not found.
 */
export async function updateUserFeedState(
  client: Client,
  semaphoreId: string,
  feedId: string
): Promise<Date | undefined> {
  const result = await client.query(
    `
    update frogcrypto_user_feeds new
    set last_fetched_at = $3
    from (select * from frogcrypto_user_feeds where semaphore_id = $1 and feed_id = $2 for update nowait) old
    where old.id = new.id
    returning old.last_fetched_at
    `,
    [semaphoreId, feedId, new Date().toUTCString()]
  );

  return result.rows[0]?.last_fetched_at;
}

/**
 * Insert frog data into the database.
 */
export async function insertFrogData(
  client: Pool,
  frogDataList: FrogCryptoFrogData[]
): Promise<void> {
  for (const frogData of frogDataList) {
    console.log(`inserting frog ${frogData.id}`, frogData);
    await sqlQuery(
      client,
      `insert into frogcrypto_frogs
    (id, name, description, biome, rarity, temperament, drop_weight, jump_min, jump_max, speed_min, speed_max, intelligence_min, intelligence_max, beauty_min, beauty_max)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    on conflict (id) do nothing`,
      [
        frogData.id,
        frogData.name,
        frogData.description,
        frogData.biome,
        frogData.rarity,
        frogData.temperament,
        frogData.drop_weight,
        frogData.jump_min,
        frogData.jump_max,
        frogData.speed_min,
        frogData.speed_max,
        frogData.intelligence_min,
        frogData.intelligence_max,
        frogData.beauty_min,
        frogData.beauty_max
      ]
    );
  }
}

export async function getFrogData(pool: Pool): Promise<FrogCryptoFrogData[]> {
  const result = await sqlQuery(pool, `select * from frogcrypto_frogs`, []);

  return result.rows;
}

/**
 * Sample a single frog based on drop_weight
 *
 * https://utopia.duth.gr/~pefraimi/research/data/2007EncOfAlg.pdf
 */
export async function sampleFrogData(
  pool: Pool,
  biomes: Biome[]
): Promise<FrogCryptoFrogData | undefined> {
  const biomeSet = biomes.map((biome) => Biome[biome]).filter(Boolean);

  const result = await sqlQuery(
    pool,
    `select * from frogcrypto_frogs
    where biome ilike any($1)
    order by random() ^ (1.0 / drop_weight)
    limit 1`,
    [biomeSet]
  );

  return result.rows[0];
}
