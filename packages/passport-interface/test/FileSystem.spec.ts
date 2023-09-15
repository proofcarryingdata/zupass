import { PCDCollection } from "@pcd/pcd-collection";
import { PCDPackage } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { expect } from "chai";
import { FeedSubscriptionManager, MockFeedApi, applyActions } from "../src";

describe("feed actions", async function () {
  const mockFeedApi = new MockFeedApi();
  const packages: PCDPackage[] = [SemaphoreIdentityPCDPackage];

  it("executing actions from a feed should work", async function () {
    const manager = new FeedSubscriptionManager(mockFeedApi);
    const firstProviderUrl = mockFeedApi.getProviders()[0];
    const feeds = await manager.listFeeds(firstProviderUrl);
    const firstFeed = feeds[0];

    manager.subscribe(firstProviderUrl, firstFeed);
    const actions = await manager.pollSubscriptions();
    const collection = new PCDCollection(packages);

    await applyActions(collection, actions);

    expect(collection.getSize()).to.eq(1);
  });
});
