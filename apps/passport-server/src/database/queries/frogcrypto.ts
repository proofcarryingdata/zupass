import { Biome } from "@pcd/eddsa-frog-pcd";
import {
  FrogCryptoDbFrogData,
  FrogCryptoFrogData
} from "@pcd/passport-interface/src/FrogCrypto";
import _ from "lodash";
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

export async function getFrogData(pool: Pool): Promise<FrogCryptoFrogData[]> {
  const result = await sqlQuery(pool, `select * from frogcrypto_frogs`, []);

  return result.rows.map(toFrogData);
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
    where frog->>'biome' ilike any($1)
    order by random() ^ (1.0 / cast(frog->>'drop_weight' as double precision))
    limit 1`,
    [biomeSet]
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return toFrogData(result.rows[0]);
}

function toFrogData(dbFrogData: FrogCryptoDbFrogData): FrogCryptoFrogData {
  return {
    ...dbFrogData.frog,
    id: dbFrogData.id,
    uuid: dbFrogData.uuid
  };
}
