import { PCDCollection } from "@pcd/pcd-collection";
import { PCDPackage } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import path from "path";
import {
  FeedSubscriptionManager,
  applyActions
} from "../src/SubscriptionManager";
import { MockFeedApi } from "./MockFeedApi";

const identity = new Identity();

describe("feed actions", async function () {
  const mockFeedApi = new MockFeedApi();
  const packages: PCDPackage[] = [SemaphoreIdentityPCDPackage];

  this.timeout(1000 * 10);

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

    await manager.subscribe(firstProviderUrl, firstFeed);
    const actions = await manager.pollSubscriptions(identity);
    const collection = new PCDCollection(packages);

    await applyActions(collection, actions);

    expect(collection.getSize()).to.eq(1);
  });
});
