import { PCDCollection } from "@pcd/pcd-collection";
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
import { FeedSubscriptionManager } from "../src/SubscriptionManager";
import { MockFeedApi } from "./MockFeedApi";

const identity = new IdentityV3();

describe("feed host", async function () {
  const mockFeedApi = new MockFeedApi();

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

  it("expired credentials should be rejected", async function () {
    // October 5th 2023, 14:30:00
    const clientDate = new Date(2023, 10, 5, 14, 30, 0, 0);
    // October 5th 2023, 15:30:00, one hour and twenty minutes later
    const serverDate = new Date(2023, 10, 5, 15, 50, 0, 0);

    MockDate.set(clientDate);

    const futureFeedApi = new MockFeedApi(serverDate);

    const manager = new FeedSubscriptionManager(futureFeedApi);

    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const response = await manager.listFeeds(firstProviderUrl);
    const feedThatVerifiesCredential = response.feeds[0];

    const collection = new PCDCollection([]);
    const credentialCache = await createCredentialCache();
    const credentialManager = new CredentialManager(
      identity,
      collection,
      credentialCache
    );

    const sub = await manager.subscribe(
      firstProviderUrl,
      feedThatVerifiesCredential
    );
    await manager.pollSubscriptions(credentialManager);

    // Request fails with expired credentials
    expect(manager.getAllErrors().size).to.eq(1);
    expect(manager.getError(sub.id)?.type).to.eq("fetch-error");

    // Make client use server date
    MockDate.set(serverDate);
    await manager.pollSubscriptions(credentialManager);
    // Request should now succeed
    expect(manager.getAllErrors().size).to.eq(0);
  });
});
