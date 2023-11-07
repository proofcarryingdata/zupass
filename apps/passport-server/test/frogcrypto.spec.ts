import { EdDSAFrogPCD, EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
import {
  FrogCryptoFeed,
  FrogCryptoFolderName,
  FrogCryptoUserStateResult,
  PollFeedResult,
  createFeedCredentialPayload,
  frogCryptoGetUserState,
  pollFeed,
  requestFrogCryptoGetScoreboard,
  requestListFeeds
} from "@pcd/passport-interface";
import { AppendToFolderAction, PCDActionType } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import _ from "lodash";
import "mocha";
import MockDate from "mockdate";
import { Pool } from "postgres-pool";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import {
  getFeedData,
  upsertFeedData,
  upsertFrogData
} from "../src/database/queries/frogcrypto";
import { Zupass } from "../src/types";
import { overrideEnvironment, testingEnv } from "./util/env";
import { testFeeds, testFrogs } from "./util/frogcrypto";
import { startTestingApp } from "./util/startTestingApplication";
import { expectToExist } from "./util/util";

const DATE_EPOCH_1H = new Date(60 * 60 * 1000);
const DATE_EPOCH_1H1M = new Date(DATE_EPOCH_1H.getTime() + 60 * 1000);
const DATE_EPOCH_1H1M59S = new Date(DATE_EPOCH_1H1M.getTime() + 59 * 1000);

describe("frogcrypto functionality", function () {
  this.timeout(30_000);
  let db: Pool;
  let application: Zupass;
  let identity: Identity;
  let frogPCD: EdDSAFrogPCD;
  let feeds: FrogCryptoFeed[];

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();
    await upsertFrogData(db, testFrogs);
    await upsertFeedData(db, testFeeds);
    feeds = await getFeedData(db);

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
    expectToExist(feeds);
    expect(feeds.length).to.eq(1);
    const feed = feeds[0] as FrogCryptoFeed;
    expectToExist(feed);
    expect(feed.activeUntil).to.be.greaterThan(Date.now() / 1000);
    expect(feed.private).to.be.false;
  });

  it("should be able to get frog", async () => {
    const feed = feeds[0];
    expectToExist(feed);
    expect(feed.activeUntil).to.be.greaterThan(Date.now() / 1000);
    expect(feed.private).to.be.false;

    await testGetFrog(feed, DATE_EPOCH_1H);
  });

  it("should be able to get frog even if feed is private", async () => {
    const feed = feeds[1];
    expectToExist(feed);
    expect(feed.activeUntil).to.be.greaterThan(Date.now() / 1000);
    expect(feed.private).to.be.true;

    await testGetFrog(feed, DATE_EPOCH_1H);
  });

  it("should not be able to get frog if feed is inactive", async () => {
    const feed = feeds[2];
    expectToExist(feed);
    expect(feed.activeUntil).to.be.lessThanOrEqual(Date.now() / 1000);
    expect(feed.private).to.be.true;

    await testGetFrogFail(feed, new Date(), "not active");
  });

  it("should be able to get two free rolls", async () => {
    const feed = feeds[0];
    expect(feed.activeUntil).to.be.greaterThan(Date.now() / 1000);
    expect(feed.private).to.be.false;
    expect(feed.cooldown).to.eq(60);

    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrogFail(
      feed,
      DATE_EPOCH_1H,
      "Next fetch available at 3660000"
    );
  });

  it("should be able to get frog if after cooldown", async () => {
    const feed = feeds[0];
    expect(feed.activeUntil).to.be.greaterThan(Date.now() / 1000);
    expect(feed.private).to.be.false;
    expect(feed.cooldown).to.eq(60);

    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H1M);
  });

  it("should not be able to get frog if before cooldown", async () => {
    const feed = feeds[0];
    expect(feed.activeUntil).to.be.greaterThan(Date.now() / 1000);
    expect(feed.private).to.be.false;
    expect(feed.cooldown).to.eq(60);

    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H1M);
    await testGetFrogFail(
      feed,
      DATE_EPOCH_1H1M59S,
      "Next fetch available at 3720000"
    );
  });

  it("should get 404 if no frogs are available", async () => {
    const feed = feeds[3];
    expect(feed.activeUntil).to.be.greaterThan(Date.now() / 1000);
    expect(feed.private).to.be.true;
    expect(feed.biomes).to.deep.eq({
      TheWrithingVoid: { dropWeightScaler: 1 }
    });

    await testGetFrogFail(feed, DATE_EPOCH_1H, "Frog Not Found");
  });

  it("should update user state after getting frog", async () => {
    const feed = feeds[0];
    expect(feed.activeUntil).to.be.greaterThan(Date.now() / 1000);
    expect(feed.private).to.be.false;

    let userState = await getUserState();
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogIds).to.deep.equal(
      _.range(1, testFrogs.length + 1)
    );
    expect(userState.value?.feeds).to.be.empty;
    expect(userState.value?.myScore).to.be.undefined;

    // first roll
    let response = await getFrog(feed, DATE_EPOCH_1H);
    expect(response.success).to.be.true;

    userState = await getUserState();
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogIds).to.deep.equal(
      _.range(1, testFrogs.length + 1)
    );
    expect(userState.value?.myScore?.score).to.eq(1);
    expect(userState.value?.myScore?.semaphore_id).to.be.eq(
      identity.getCommitment().toString()
    );
    expect(userState.value?.feeds).to.be.not.empty;
    let feedState = userState.value?.feeds?.[0];
    expect(feedState?.feedId).to.eq(feed.id);
    expect(feedState?.lastFetchedAt).to.eq(0);
    expect(feedState?.nextFetchAt).to.eq(feed.cooldown * 1000);

    // second roll
    await getFrog(feed, DATE_EPOCH_1H);
    // third roll
    response = await getFrog(feed, DATE_EPOCH_1H);
    expect(response.success).to.be.true;

    userState = await getUserState();
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogIds).to.deep.equal(
      _.range(1, testFrogs.length + 1)
    );
    expect(userState.value?.myScore?.score).to.eq(3);
    expect(userState.value?.myScore?.semaphore_id).to.be.eq(
      identity.getCommitment().toString()
    );
    expect(userState.value?.feeds).to.be.not.empty;
    feedState = userState.value?.feeds?.[0];
    expect(feedState?.feedId).to.eq(feed.id);
    expect(feedState?.lastFetchedAt).to.eq(DATE_EPOCH_1H.getTime());
    expect(feedState?.nextFetchAt).to.eq(
      DATE_EPOCH_1H.getTime() + feed.cooldown * 1000
    );
  });

  it("should return hi scores", async () => {
    const response = await requestFrogCryptoGetScoreboard(
      application.expressContext.localEndpoint
    );
    expect(response.success).to.be.true;
    const scores = response.value;
    expectToExist(scores);
    expect(scores.length).to.greaterThan(1);
    expect(scores[0].rank).to.eq(1);
    expect(scores[0].score).to.eq(4);
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
