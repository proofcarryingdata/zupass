import { PCDCollection } from "@pcd/pcd-collection";
import { PCDPackage } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { expect } from "chai";
import "mocha";
import MockDate from "mockdate";
import path from "path";
import {
  CredentialManager,
  createCredentialCache
} from "../src/CredentialManager";
import {
  FeedSubscriptionManager,
  applyActions
} from "../src/SubscriptionManager";
import { MockFeedApi } from "./MockFeedApi";

const identity = new IdentityV3();

describe("feed actions", async function () {
  const mockFeedApi = new MockFeedApi();
  const packages: PCDPackage[] = [SemaphoreIdentityPCDPackage];

  this.beforeEach(() => {
    // Means that the time won't change during the test, which could cause
    // spurious issues with timestamps in feed credentials.
    MockDate.set(new Date());
  });

  this.afterEach(() => {
    MockDate.reset();
  });

  this.beforeAll(async () => {
    const fullPath = path.join(__dirname, "../artifacts/");

    await SemaphoreSignaturePCDPackage.init?.({
      wasmFilePath: fullPath + "16.wasm",
      zkeyFilePath: fullPath + "16.zkey"
    });
  });

  it("executing actions from a feed should work", async function () {
    const manager = new FeedSubscriptionManager(mockFeedApi);
    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const response = await manager.listFeeds(firstProviderUrl);
    const firstFeed = response.feeds[0];

    const collection = new PCDCollection(packages);
    const credentialCache = await createCredentialCache();
    const credentialManager = new CredentialManager(
      identity,
      collection,
      credentialCache
    );

    await manager.subscribe(firstProviderUrl, firstFeed);
    const actions = await manager.pollSubscriptions(credentialManager);

    await applyActions(collection, actions);

    expect(collection.getSize()).to.eq(1);
  });
});
