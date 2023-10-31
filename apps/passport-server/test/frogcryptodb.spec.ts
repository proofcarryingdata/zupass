import { Biome } from "@pcd/eddsa-frog-pcd";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { step } from "mocha-steps";
import { Client } from "pg";
import { Pool } from "postgres-pool";
import { getDB } from "../src/database/postgresPool";
import {
  fetchUserFeedsState,
  getFrogData,
  initializeUserFeedState,
  insertFrogData,
  sampleFrogData,
  updateUserFeedState
} from "../src/database/queries/frogcrypto";
import { overrideEnvironment, testingEnv } from "./util/env";
import { testFrogs } from "./util/frogcrypto";

describe("database reads and writes for frogcrypto features", function () {
  this.timeout(15_000);

  let db: Pool;
  let client: Client;

  this.beforeAll(async () => {
    chai.use(chaiAsPromised);
    await overrideEnvironment(testingEnv);
    db = await getDB();
    client = await db.connect();
  });

  this.afterAll(async () => {
    await client.end();
    await db.end();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  step("insert frogs", async function () {
    await insertFrogData(db, testFrogs);

    const allFrogs = await getFrogData(db);
    expect(allFrogs.length).to.eq(testFrogs.length);
  });

  step("sample a frog", async function () {
    const frog = await sampleFrogData(db, [Biome.Jungle]);

    expect(frog?.biome).to.eq("Jungle");
  });

  step("return undefined if there is no frog to sample", async function () {
    const frog = await sampleFrogData(db, []);

    expect(frog).to.be.undefined;
  });

  step("initialize user feed state", async function () {
    const emptyState = await fetchUserFeedsState(db, "test");
    expect(emptyState).to.be.empty;

    await initializeUserFeedState(db, "test", "test");
    const initState = await fetchUserFeedsState(db, "test");
    expect(initState).to.not.be.empty;
    const feedState = initState[0];
    expect(feedState.feed_id).to.eq("test");
    expect(feedState.last_fetched_at.getTime()).to.be.eq(0);

    // re-init should have no effect
    await initializeUserFeedState(db, "test", "test");
  });

  step("reserves only one update at a time", async function () {
    await client.query("BEGIN");
    const firstFetchedAt = await updateUserFeedState(client, "test", "test");
    expect(firstFetchedAt?.getTime()).to.be.eq(0);

    const client2 = await db.connect();
    await client2.query("BEGIN");
    await expect(
      updateUserFeedState(client2, "test", "test")
    ).to.be.rejectedWith("could not obtain lock");

    await client.query("COMMIT");
    await client2.query("COMMIT");
    await client2.release();

    const userFeedState = await fetchUserFeedsState(db, "test");
    expect(userFeedState[0].last_fetched_at.getTime()).to.be.greaterThan(0);
  });
});
