import {
  Biome,
  EdDSAFrogPCD,
  EdDSAFrogPCDPackage,
  Rarity
} from "@pcd/eddsa-frog-pcd";
import {
  FrogCryptoFeed,
  FrogCryptoFolderName,
  FrogCryptoShareTelegramHandleResult,
  FrogCryptoUserStateResult,
  PollFeedResult,
  ZUPASS_CREDENTIAL_REQUEST,
  requestFrogCryptoGetScoreboard,
  requestFrogCryptoGetUserState,
  requestFrogCryptoUpdateTelegramHandleSharing,
  requestListFeeds,
  requestPollFeed
} from "@pcd/passport-interface";
import { AppendToFolderAction, PCDActionType } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { sha256 } from "js-sha256";
import "mocha";
import MockDate from "mockdate";
import { Pool, PoolClient } from "postgres-pool";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import {
  getFeedData,
  getFrogData,
  incrementScore,
  upsertFeedData,
  upsertFrogData
} from "../src/database/queries/frogcrypto";
import {
  insertTelegramChat,
  insertTelegramVerification
} from "../src/database/queries/telegram/insertTelegramConversation";
import { Zupass } from "../src/types";
import { makeTestCredential } from "./generic-issuance/util";
import { testLogin } from "./user/testLogin";
import { overrideEnvironment, testingEnv } from "./util/env";
import {
  testDexFrogs,
  testFeeds,
  testFrogs,
  testFrogsAndObjects
} from "./util/frogcrypto";
import { startTestingApp } from "./util/startTestingApplication";
import { expectToExist } from "./util/util";

const DATE_EPOCH_1H = new Date(60 * 60 * 1000);
const DATE_EPOCH_1H1M = new Date(DATE_EPOCH_1H.getTime() + 60 * 1000);
const DATE_EPOCH_1H1M59S = new Date(DATE_EPOCH_1H1M.getTime() + 59 * 1000);

describe("frogcrypto functionality", function () {
  let pool: Pool;
  let client: PoolClient;
  let application: Zupass;
  let identity: Identity;
  let frogPCD: EdDSAFrogPCD;
  let feeds: FrogCryptoFeed[];

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    pool = await getDB();
    client = await pool.connect();

    await upsertFrogData(client, testFrogs);
    await upsertFeedData(client, testFeeds);
    feeds = await getFeedData(client);

    application = await startTestingApp();

    await EdDSAFrogPCDPackage.init?.({});
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await client.end();
    await pool.end();
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
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.autoPoll).to.be.false;
    expect(feed.private).to.be.false;
    // secret value is not returned
    expect(feed.biomes).to.be.undefined;
  });

  it("should be able to look up feed even it is private", async function () {
    const feed = feeds[5];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.true;

    const response = await requestListFeeds(
      `${application.expressContext.localEndpoint}/frogcrypto/feeds/${feed.id}`
    );
    expect(response.success).to.be.true;
    const resFeeds = response.value?.feeds;
    expectToExist(resFeeds);
    expect(resFeeds.length).to.eq(1);
    const resFeed = resFeeds[0] as FrogCryptoFeed;
    expectToExist(resFeed);
    expect(resFeed.id).to.eq(feed.id);
    expect(resFeed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.autoPoll).to.be.false;
    expect(resFeed.private).to.be.true;
    // secret value is not returned
    expect(resFeed.codes).to.be.undefined;
    expect(resFeed.biomes).to.be.undefined;
  });

  it("should be able to look up feed by its secret code", async function () {
    const feed = feeds[5];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.true;
    const code = feed.codes?.[1];
    expectToExist(code);

    const response = await requestListFeeds(
      `${application.expressContext.localEndpoint}/frogcrypto/feeds/${code}`
    );
    expect(response.success).to.be.true;
    const resFeeds = response.value?.feeds;
    expectToExist(resFeeds);
    expect(resFeeds.length).to.eq(1);
    const resFeed = resFeeds[0] as FrogCryptoFeed;
    expectToExist(resFeed);
    expect(resFeed.id).to.eq(feed.id);
    expect(resFeed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(resFeed.private).to.be.true;
    // secret value is not returned
    expect(resFeed.codes).to.be.undefined;
    expect(resFeed.biomes).to.be.undefined;
  });

  it("should be able to get frog", async () => {
    const feed = feeds[0];
    expectToExist(feed);
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.false;

    await testGetFrog(feed, DATE_EPOCH_1H);
  });

  it("should be able to get frog even if feed is private", async () => {
    const feed = feeds[1];
    expectToExist(feed);
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.true;

    await testGetFrog(feed, DATE_EPOCH_1H);
  });

  it("should not be able to get frog if feed is inactive", async () => {
    const feed = feeds[2];
    expectToExist(feed);
    expect(feed.activeUntil * 1000).to.be.lessThanOrEqual(Date.now());
    expect(feed.private).to.be.true;

    await testGetFrogFail(feed, new Date(), "not active");
  });

  it("should be able to get two free rolls", async () => {
    const feed = feeds[0];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
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
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.false;
    expect(feed.cooldown).to.eq(60);

    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H);
    await testGetFrog(feed, DATE_EPOCH_1H1M);
  });

  it("should not be able to get frog if before cooldown", async () => {
    const feed = feeds[0];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
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

  it("should return frog from complex biome", async () => {
    const feed = feeds[4];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.true;
    expect(feed.biomes).to.deep.eq({
      TheCapital: { dropWeightScaler: 1 }
    });

    await testGetFrog(feed, DATE_EPOCH_1H);
    expect(frogPCD.claim.data.biome).to.eq(Biome.TheCapital);
  });

  it("should sample frog attribute based on prototype", async () => {
    const feed = feeds[4];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.true;
    expect(feed.biomes).to.deep.eq({
      TheCapital: { dropWeightScaler: 1 }
    });

    const prototype = (await getFrogData(client)).find(
      (frog) => frog.biome === "The Capital"
    );
    expectToExist(prototype);
    expect(prototype.intelligence_min).to.eq(0);
    expect(prototype.intelligence_max).to.eq(0);
    expect(prototype.beauty_min).to.be.undefined;
    expect(prototype.beauty_max).to.be.undefined;

    await testGetFrog(feed, DATE_EPOCH_1H);
    expect(frogPCD.claim.data.biome).to.eq(Biome.TheCapital);
    expect(frogPCD.claim.data.intelligence).to.eq(0);
    expect(frogPCD.claim.data.beauty).to.be.finite;
  });

  it("should get 404 if no frogs are available", async () => {
    const feed = feeds[3];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.true;
    expect(feed.biomes).to.deep.eq({
      TheWrithingVoid: { dropWeightScaler: 1 }
    });

    await testGetFrogFail(feed, DATE_EPOCH_1H, "Frog Not Found");
  });

  it("should update user state after getting frog", async () => {
    const feed = feeds[0];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.false;

    let userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogs).to.deep.equal(testDexFrogs);
    expect(userState.value?.myScore).to.be.undefined;
    expect(userState.value?.feeds).to.have.length(1);
    let feedState = userState.value?.feeds?.[0];
    expectToExist(feedState);
    expect(feedState.feedId).to.eq(feed.id);
    expect(feedState.lastFetchedAt).to.eq(0);
    expect(feedState.nextFetchAt).to.eq(feed.cooldown * 1000);
    expect(feedState.active).to.be.true;

    // first roll
    let response = await getFrog(feed, DATE_EPOCH_1H);
    expect(response.success).to.be.true;

    userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogs).to.deep.equal(testDexFrogs);
    expect(userState.value?.myScore?.score).to.eq(1);
    expect(userState.value?.myScore?.semaphore_id_hash).to.be.eq(
      getSemaphoreIdHash(identity)
    );
    expect(userState.value?.feeds).to.be.not.empty;
    feedState = userState.value?.feeds?.[0];
    expectToExist(feedState);
    expect(feedState.feedId).to.eq(feed.id);
    expect(feedState.lastFetchedAt).to.eq(0);
    expect(feedState.nextFetchAt).to.eq(feed.cooldown * 1000);
    expect(feedState.active).to.be.true;

    // second roll
    await getFrog(feed, DATE_EPOCH_1H);
    // third roll
    response = await getFrog(feed, DATE_EPOCH_1H);
    expect(response.success).to.be.true;

    userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogs).to.deep.equal(testDexFrogs);
    expect(userState.value?.myScore?.score).to.eq(3);
    expect(userState.value?.myScore?.semaphore_id_hash).to.be.eq(
      getSemaphoreIdHash(identity)
    );
    expect(userState.value?.feeds).to.be.not.empty;
    feedState = userState.value?.feeds?.[0];
    expectToExist(feedState);
    expect(feedState.feedId).to.eq(feed.id);
    expect(feedState?.lastFetchedAt).to.eq(DATE_EPOCH_1H.getTime());
    expect(feedState?.nextFetchAt).to.eq(
      DATE_EPOCH_1H.getTime() + feed.cooldown * 1000
    );
    expect(feedState.active).to.be.true;
  });

  it("should not return feed state if not asked for", async () => {
    const oldFeed = feeds[0];
    const newFeed = feeds[1];
    MockDate.set(oldFeed.activeUntil * 1000);
    expect(oldFeed.activeUntil * 1000).to.be.eq(Date.now());
    expect(newFeed.activeUntil * 1000).to.be.eq(Date.now());
    expect(oldFeed.private).to.be.false;
    expect(newFeed.private).to.be.true;

    const userState = await getUserState([newFeed.id]);
    expect(userState.success).to.be.true;
    expect(userState.value?.possibleFrogs).to.deep.equal(testDexFrogs);
    expect(userState.value?.myScore).to.be.undefined;
    expect(userState.value?.feeds).to.have.length(1);
    const feedState = userState.value?.feeds?.[0];
    expectToExist(feedState);
    expect(feedState.feedId).to.eq(newFeed.id);
    expect(feedState.lastFetchedAt).to.eq(0);
    expect(feedState.nextFetchAt).to.eq(newFeed.cooldown * 1000);
    expect(feedState.active).to.be.false;

    MockDate.reset();
  });

  it("should no longer give frog if user reaches score cap", async () => {
    const feed = feeds[0];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.false;
    expect(feed.cooldown).to.eq(60);

    const client = await pool.connect();
    await incrementScore(
      client,
      identity.getCommitment().toString(),
      Rarity.Unknown,
      100000
    );
    await client.end();

    await testGetFrogFail(feed, DATE_EPOCH_1H, "Frog faucet off.");
  });

  it("should not increment score if getting an object", async () => {
    await upsertFrogData(client, testFrogsAndObjects);
    const feed = feeds[5];
    expect(feed.activeUntil * 1000).to.be.greaterThan(Date.now());
    expect(feed.private).to.be.true;
    expect(feed.biomes).to.deep.eq({
      Unknown: { dropWeightScaler: 1 }
    });

    await testGetFrog(feed, DATE_EPOCH_1H);

    const userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    expect(userState.value?.myScore).to.deep.include({ score: 0 });
    expect(userState.value?.feeds).to.have.length(1);
    const feedState = userState.value?.feeds?.[0];
    expectToExist(feedState);
    expect(feedState.feedId).to.eq(feed.id);
    expect(feedState.lastFetchedAt).to.eq(0);
    expect(feedState.nextFetchAt).to.eq(feed.cooldown * 1000);
    expect(feedState.active).to.be.true;
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
    expect(scores[0].score).to.eq(100000);
  });

  it("should return has_telegram_username and share tg username", async () => {
    const loginResult = await testLogin(application, "frog1@crypto.xyz", {
      force: true,
      expectUserAlreadyLoggedIn: false,
      expectEmailIncorrect: false,
      skipSetupPassword: true
    });

    expect(loginResult?.identity).to.not.be.empty;
    identity = loginResult?.identity as Identity;

    await insertTelegramChat(client, 101);
    await insertTelegramVerification(
      client,
      11,
      101,
      identity.getCommitment().toString(),
      "test"
    );

    const feed = feeds[0];
    await testGetFrog(feed, DATE_EPOCH_1H);

    let userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    let score = userState.value?.myScore;
    expectToExist(score);
    expect(score.has_telegram_username).to.be.true;
    expect(score.telegram_username).to.be.null;

    await updateTelegramHandleSharing(true);
    userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    score = userState.value?.myScore;
    expectToExist(score);
    expect(score.has_telegram_username).to.be.true;
    expect(score.telegram_username).to.eq("test");

    await updateTelegramHandleSharing(false);
    userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    score = userState.value?.myScore;
    expectToExist(score);
    expect(score.has_telegram_username).to.be.true;
    expect(score.telegram_username).to.be.null;
  });

  it("should return has_telegram_username false if username does not exists", async () => {
    const loginResult = await testLogin(application, "frog2@crypto.xyz", {
      force: true,
      expectUserAlreadyLoggedIn: false,
      expectEmailIncorrect: false,
      skipSetupPassword: true
    });

    expect(loginResult?.identity).to.not.be.empty;
    identity = loginResult?.identity as Identity;

    await insertTelegramChat(client, 102);
    await insertTelegramVerification(
      client,
      12,
      102,
      identity.getCommitment().toString()
    );

    const feed = feeds[0];
    await testGetFrog(feed, DATE_EPOCH_1H);

    let userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    let score = userState.value?.myScore;
    expectToExist(score);
    expect(score.has_telegram_username).to.be.false;
    expect(score.telegram_username).to.be.null;

    await updateTelegramHandleSharing(true);
    userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    score = userState.value?.myScore;
    expectToExist(score);
    expect(score.has_telegram_username).to.be.false;
    expect(score.telegram_username).to.be.null;

    await updateTelegramHandleSharing(false);
    userState = await getUserState([feed.id]);
    expect(userState.success).to.be.true;
    score = userState.value?.myScore;
    expectToExist(score);
    expect(score.has_telegram_username).to.be.false;
    expect(score.telegram_username).to.be.null;
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
    const response = await requestPollFeed(
      `${application.expressContext.localEndpoint}/frogcrypto/feeds`,
      {
        pcd: await makeTestCredential(identity, ZUPASS_CREDENTIAL_REQUEST),
        feedId: feed.id
      }
    );
    MockDate.reset();

    return response;
  }

  async function getUserState(
    feedIds: string[]
  ): Promise<FrogCryptoUserStateResult> {
    return requestFrogCryptoGetUserState(
      application.expressContext.localEndpoint,
      {
        pcd: await makeTestCredential(identity, ZUPASS_CREDENTIAL_REQUEST),
        feedIds
      }
    );
  }

  async function updateTelegramHandleSharing(
    shareTelegramHandle: boolean
  ): Promise<FrogCryptoShareTelegramHandleResult> {
    return requestFrogCryptoUpdateTelegramHandleSharing(
      application.expressContext.localEndpoint,
      {
        pcd: await makeTestCredential(identity, ZUPASS_CREDENTIAL_REQUEST),
        reveal: shareTelegramHandle
      }
    );
  }

  function getSemaphoreIdHash(identity: Identity): string {
    return "0x" + sha256("frogcrypto_" + identity.getCommitment().toString());
  }
});
