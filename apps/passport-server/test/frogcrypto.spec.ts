import { EdDSAFrogPCD, EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
import {
  PollFeedResult,
  createFeedCredentialPayload,
  pollFeed,
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
import { Zupass } from "../src/types";
import { FROGCRYPTO_FEEDS, FrogCryptoFeed } from "../src/util/frogcrypto";
import { testLogin } from "./user/testLoginPCDPass";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { randomEmail } from "./util/util";

describe("frogcrypto functionality", function () {
  this.timeout(30_000);
  let db: Pool;
  let application: Zupass;
  let identity: Identity;
  let frogPCD: EdDSAFrogPCD;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();

    application = await startTestingApp();

    await EdDSAFrogPCDPackage.init?.({});
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await db.end();
  });

  it("should be able to log in", async function () {
    const result = await testLogin(application, randomEmail(), {
      expectEmailIncorrect: false,
      expectUserAlreadyLoggedIn: false,
      force: false,
      skipSetupPassword: false
    });

    if (!result) {
      throw new Error("failed to log in");
    }

    expect(result).to.not.be.undefined;

    identity = result.identity;
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

    const response = await getFrog(feed);
    expect(response.success).to.be.true;

    expect(response.value?.actions.length).to.eq(1);
    const populateAction = response.value?.actions[0] as AppendToFolderAction;
    expect(populateAction.type).to.eq(PCDActionType.AppendToFolder);
    expect(populateAction.folder).to.eq("FrogCrypto");
    expect(populateAction.pcds[0].type).to.eq(EdDSAFrogPCDPackage.name);

    frogPCD = await EdDSAFrogPCDPackage.deserialize(populateAction.pcds[0].pcd);
    expect(frogPCD.claim.data.ownerSemaphoreId).to.eq(
      identity.commitment.toString()
    );
    expect(EdDSAFrogPCDPackage.verify(frogPCD)).to.eventually.become(true);
  });

  it("should be able to get frog even if feed is private", async () => {
    const feed = FROGCRYPTO_FEEDS[1];
    expect(feed.active).to.be.true;
    expect(feed.private).to.be.true;

    const response = await getFrog(feed);
    expect(response.success).to.be.true;

    expect(response.value?.actions.length).to.eq(1);
    const populateAction = response.value?.actions[0] as AppendToFolderAction;
    expect(populateAction.type).to.eq(PCDActionType.AppendToFolder);
    expect(populateAction.folder).to.eq("FrogCrypto");
    expect(populateAction.pcds[0].type).to.eq(EdDSAFrogPCDPackage.name);

    frogPCD = await EdDSAFrogPCDPackage.deserialize(populateAction.pcds[0].pcd);
    expect(frogPCD.claim.data.ownerSemaphoreId).to.eq(
      identity.commitment.toString()
    );
    expect(EdDSAFrogPCDPackage.verify(frogPCD)).to.eventually.become(true);
  });

  it("should not be able to get frog if feed is inactive", async () => {
    const feed = FROGCRYPTO_FEEDS[2];
    expect(feed.active).to.be.false;
    expect(feed.private).to.be.true;

    const response = await getFrog(feed);
    expect(response.success).to.be.false;
    expect(response.error).to.include("not active");
  });

  async function getFrog(feed: FrogCryptoFeed): Promise<PollFeedResult> {
    MockDate.set(new Date());
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
});
