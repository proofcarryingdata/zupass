import { FrogCryptoDbFeedData } from "@pcd/passport-interface";
import { expect } from "chai";
import _ from "lodash";
import "mocha";
import { step } from "mocha-steps";
import { Pool, PoolClient } from "postgres-pool";
import { getDB } from "../src/database/postgresPool";
import {
  deleteFrogData,
  fetchUserFeedsState,
  getFeedData,
  getFrogData,
  getPossibleFrogs,
  initializeUserFeedState,
  sampleFrogData,
  updateUserFeedState,
  upsertFeedData,
  upsertFrogData
} from "../src/database/queries/frogcrypto";
import { overrideEnvironment, testingEnv } from "./util/env";
import {
  testDexFrogs,
  testDexFrogsAndObjects,
  testFeeds,
  testFrogs,
  testFrogsAndObjects
} from "./util/frogcrypto";

describe("database reads and writes for frogcrypto features", function () {
  let pool: Pool;
  let client: PoolClient;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    pool = await getDB();
    client = await pool.connect();
  });

  this.afterAll(async () => {
    await client.end();
    await pool.end();
  });

  step("database should initialize", async function () {
    expect(pool).to.not.eq(null);
  });

  step("insert frogs", async function () {
    await upsertFrogData(client, testFrogs);

    const allFrogs = await getFrogData(client);
    expect(allFrogs.length).to.eq(testFrogs.length);
  });

  step("update frogs", async function () {
    const mutatedFrog = {
      ...testFrogs[3],
      biome: "Swamp"
    };
    await upsertFrogData(client, [mutatedFrog]);

    const allFrogs = await getFrogData(client);
    expect(allFrogs.length).to.eq(testFrogs.length);
    expect(allFrogs.find((frog) => frog.id === mutatedFrog.id)?.biome).to.eq(
      "Swamp"
    );
  });

  step("delete frogs", async function () {
    const frogId = testFrogs[3].id;
    await deleteFrogData(client, [frogId]);

    const allFrogs = await getFrogData(client);
    expect(allFrogs.length).to.eq(testFrogs.length - 1);
    expect(allFrogs.map((frog) => frog.id)).does.not.include(frogId);
  });

  step("sample a frog", async function () {
    const frog = await sampleFrogData(client, {
      Jungle: { dropWeightScaler: 1 }
    });

    expect(frog?.biome).to.eq("Jungle");
  });

  step("sample a frog from complexly named biome", async function () {
    const frog = await sampleFrogData(client, {
      TheCapital: { dropWeightScaler: 1 }
    });

    expect(frog?.biome).to.eq("The Capital");
  });

  step("sample a frog from weighted biomes", async function () {
    const frogs = await Promise.all(
      _.range(0, 1000).map(() =>
        sampleFrogData(client, {
          TheCapital: { dropWeightScaler: 100 },
          Desert: { dropWeightScaler: 0.01 },
          Jungle: { dropWeightScaler: 0 } // 0 weight should be ignored
        })
      )
    );

    // sample 1000 frogs with Capital frog expect to show up 99.98% chance each time. there is < 1e-14 chance for non capital frog to show up more than 10 times
    expect(
      frogs.filter((frog) => frog?.biome === "The Capital").length
    ).to.be.greaterThanOrEqual(990);
  });

  step("return undefined if there is no frog to sample", async function () {
    const frog = await sampleFrogData(client, {});

    expect(frog).to.be.undefined;
  });

  step("initialize user feed state", async function () {
    const emptyState = await fetchUserFeedsState(client, "test");
    expect(emptyState).to.be.empty;

    await initializeUserFeedState(client, "test", "test");
    let initState = await fetchUserFeedsState(client, "test");
    expect(initState).to.not.be.empty;
    let feedState = initState[0];
    expect(feedState.feed_id).to.eq("test");
    expect(feedState.last_fetched_at.getTime()).to.be.eq(0);

    // re-init should have no effect
    await initializeUserFeedState(client, "test", "test");
    initState = await fetchUserFeedsState(client, "test");
    expect(initState).to.not.be.empty;
    feedState = initState[0];
    expect(feedState.feed_id).to.eq("test");
    expect(feedState.last_fetched_at.getTime()).to.be.eq(0);
  });

  step("reserves only one update at a time", async function () {
    await client.query("BEGIN");
    const firstFetchedAt = await updateUserFeedState(client, "test", "test");
    expect(firstFetchedAt?.getTime()).to.be.eq(0);

    const client2 = await pool.connect();
    await client2.query("BEGIN");
    await expect(
      updateUserFeedState(client2, "test", "test")
    ).to.be.rejectedWith("could not obtain lock");

    await client.query("COMMIT");
    await client2.query("COMMIT");
    await client2.release();

    const userFeedState = await fetchUserFeedsState(client, "test");
    expect(userFeedState[0].last_fetched_at.getTime()).to.be.greaterThan(0);
  });

  step("returns possible frog ids excluding objects", async function () {
    await upsertFrogData(client, testFrogsAndObjects);

    const possibleFrogs = await getPossibleFrogs(client);
    expect(possibleFrogs).to.deep.eq(
      [...testDexFrogs, ...testDexFrogsAndObjects].filter(
        ({ id }) => ![4, 6, 7].includes(id)
      )
    );
  });

  step("insert feeds", async function () {
    await upsertFeedData(client, testFeeds);

    const allFeeds = await getFeedData(client);
    expect(allFeeds.length).to.eq(testFeeds.length);
  });

  step("update feeds", async function () {
    const mutatedFeed = JSON.parse(
      JSON.stringify(testFeeds[3])
    ) as FrogCryptoDbFeedData;
    mutatedFeed.feed.private = false;
    await upsertFeedData(client, [mutatedFeed]);

    const allFeeds = await getFeedData(client);
    expect(allFeeds.length).to.eq(testFeeds.length);
    expect(
      allFeeds.find((feed) => feed.id === mutatedFeed.uuid)?.private
    ).to.eq(false);
  });

  step("upsert feeds", async function () {
    const mutatedFeed = JSON.parse(
      JSON.stringify(testFeeds[3])
    ) as FrogCryptoDbFeedData;
    mutatedFeed.feed.activeUntil = 0;
    const newFeed = {
      ...testFeeds[3],
      uuid: "065f829b-8aff-4f6a-9457-768a3a0d757b"
    };
    await upsertFeedData(client, [mutatedFeed, newFeed]);

    const allFeeds = await getFeedData(client);
    expect(allFeeds.length).to.eq(testFeeds.length + 1);
    expect(
      allFeeds.find((feed) => feed.id === mutatedFeed.uuid)?.activeUntil
    ).to.deep.eq(0);
    expect(allFeeds.find((feed) => feed.id === newFeed.uuid)).to.deep.include({
      id: newFeed.uuid,
      ...newFeed.feed
    });
  });
});
