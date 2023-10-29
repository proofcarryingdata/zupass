import { Biome, EdDSAFrogPCD, EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
import {
  FrogCryptoFolderName,
  FrogCryptoUserStateResult,
  PollFeedResult,
  createFeedCredentialPayload,
  frogCryptoGetUserState,
  pollFeed,
  requestFrogCryptoGetScores,
  requestListFeeds
} from "@pcd/passport-interface";
import { AppendToFolderAction, PCDActionType } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import MockDate from "mockdate";
import { Pool } from "postgres-pool";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import { upsertFrogData } from "../src/database/queries/frogcrypto";
import { Zupass } from "../src/types";
import { FROGCRYPTO_FEEDS, FrogCryptoFeed } from "../src/util/frogcrypto";
import { overrideEnvironment, testingEnv } from "./util/env";
import { testFrogs } from "./util/frogcrypto";
import { startTestingApp } from "./util/startTestingApplication";

const DATE_EPOCH_1H = new Date(60 * 60 * 1000);
const DATE_EPOCH_1H1M = new Date(DATE_EPOCH_1H.getTime() + 60 * 1000);
const DATE_EPOCH_1H1M59S = new Date(DATE_EPOCH_1H1M.getTime() + 59 * 1000);

describe("frogcrypto functionality", function () {
  this.timeout(30_000);
  let db: Pool;
  let application: Zupass;
  let identity: Identity;
  let frogPCD: EdDSAFrogPCD;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();
    await upsertFrogData(db, testFrogs);

    application = await startTestingApp();

    await EdDSAFrogPCDPackage.init?.({});
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await db.end();
  });

  this.beforeEach(async () => {
    identity = new Identity();
  });

  it("should be able to discover only public feeds", async function () {
    const response = await requestListFeeds(
      `${application.expressContext.localEndpoint}/frogcrypto/feeds`
    );
    expect(response.success).to.be.true;
    const feeds = response.value?.feeds;
    expect(feeds).to.not.be.undefined;
    expect(feeds?.length).to.eq(1);
    const feed = feeds?.[0] as FrogCryptoFeed;
    expect(feed?.active).to.be.true;
    expect(feed?.private).to.be.false;
  });

  it("should be able to get frog", async () => {
    const feed = FROGCRYPTO_FEEDS[0];
    expect(feed.active).to.be.true;
    expect(feed.private).to.be.false;

    await testGetFrog(feed, DATE_EPOCH_1H);
  });

  it("should be able to get frog even if feed is private", async () => {
    const feed = FROGCRYPTO_FEEDS[1];
    expect(feed.active).to.be.true;
    expect(feed.private).to.be.true;

    await testGetFrog(feed, DATE_EPOCH_1H);
  });

  it("should not be able to get frog if feed is inactive", async () => {
    const feed = FROGCRYPTO_FEEDS[2];
    expect(feed.active).to.be.false;
    expect(feed.private).to.be.true;

    await testGetFrogFail(feed, DATE_EPOCH_1H, "not active");
  });

  it("should be able to get frog if after cooldown", async () => {
    const feed = FROGCRYPTO_FEEDS[0];
    expect(feed.active).to.be.true;
    expect(feed.private).to.be.false;
    expect(feed.cooldown).to.eq(60);

    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H1M);
  });

  it("should not be able to get frog if before cooldown", async () => {
    const feed = FROGCRYPTO_FEEDS[0];
    expect(feed.active).to.be.true;
    expect(feed.private).to.be.false;
    expect(feed.cooldown).to.eq(60);

    await testGetFrog(feed, DATE_EPOCH_1H1M);
    await testGetFrogFail(
      feed,
      DATE_EPOCH_1H1M59S,
      "Next fetch available at 3720000"
    );
  });

  it("should get 404 if no frogs are available", async () => {
    const feed = FROGCRYPTO_FEEDS[3];
    expect(feed.active).to.be.true;
    expect(feed.private).to.be.true;
    expect(feed.biomes).to.have.same.members([Biome.TheWrithingVoid]);

    await testGetFrogFail(feed, DATE_EPOCH_1H, "Frog Not Found");
  });

  it("should update user state after getting frog", async () => {
    const feed = FROGCRYPTO_FEEDS[0];
    expect(feed.active).to.be.true;
    expect(feed.private).to.be.false;

    let userState = await getUserState();
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogCount).to.be.eq(testFrogs.length);
    expect(userState.value?.feeds).to.be.empty;
    expect(userState.value?.score).to.be.undefined;

    const response = await getFrog(feed, DATE_EPOCH_1H);
    expect(response.success).to.be.true;

    userState = await getUserState();
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogCount).to.be.eq(testFrogs.length);
    expect(userState.value?.score?.score).to.eq("1");
    expect(userState.value?.feeds).to.be.not.empty;
    const feedState = userState.value?.feeds?.[0];
    expect(feedState?.feedId).to.eq(feed.id);
    expect(feedState?.lastFetchedAt).to.eq(DATE_EPOCH_1H.getTime());
    expect(feedState?.nextFetchAt).to.eq(
      DATE_EPOCH_1H.getTime() + feed.cooldown * 1000
    );
  });

  it("should return hi scores", async () => {
    const response = await requestFrogCryptoGetScores(
      application.expressContext.localEndpoint
    );
    expect(response.success).to.be.true;
    const scores = response.value;
    expect(scores).to.not.be.undefined;
    expect(scores?.length).to.greaterThan(1);
    expect(scores?.[0].rank).to.eq("1");
    expect(scores?.[0].score).to.eq("2");
  });

  async function testGetFrog(
    feed: FrogCryptoFeed,
    now: Date
  ): Promise<PollFeedResult> {
    const response = await getFrog(feed, now);
    expect(response.success).to.be.true;

    expect(response.value?.actions.length).to.eq(1);
    const populateAction = response.value?.actions[0] as AppendToFolderAction;
    expect(populateAction.type).to.eq(PCDActionType.AppendToFolder);
    expect(populateAction.folder).to.eq(FrogCryptoFolderName);
    expect(populateAction.pcds[0].type).to.eq(EdDSAFrogPCDPackage.name);

    frogPCD = await EdDSAFrogPCDPackage.deserialize(populateAction.pcds[0].pcd);
    expect(EdDSAFrogPCDPackage.verify(frogPCD)).to.eventually.become(true);
    expect(frogPCD.claim.data.ownerSemaphoreId).to.eq(
      identity.commitment.toString()
    );
    return response;
  }

  async function testGetFrogFail(
    feed: FrogCryptoFeed,
    now: Date,
    error: string
  ): Promise<PollFeedResult> {
    const response = await getFrog(feed, now);
    expect(response.success).to.be.false;
    expect(response.error).to.include(error);
    return response;
  }

  async function getFrog(
    feed: FrogCryptoFeed,
    now: Date
  ): Promise<PollFeedResult> {
    MockDate.set(now);
    const payload = JSON.stringify(createFeedCredentialPayload());
    const response = await pollFeed(
      `${application.expressContext.localEndpoint}/frogcrypto/feeds`,
      identity,
      payload,
      feed.id
    );
    MockDate.reset();

    return response;
  }

  async function getUserState(): Promise<FrogCryptoUserStateResult> {
    const payload = JSON.stringify(createFeedCredentialPayload());
    return frogCryptoGetUserState(
      application.expressContext.localEndpoint,
      identity,
      payload
    );
  }
});
