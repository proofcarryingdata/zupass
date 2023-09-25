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
    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const response = await manager.listFeeds(firstProviderUrl);
    const firstFeed = response.feeds[0];

    manager.subscribe(firstProviderUrl, firstFeed);
    const actions = await manager.pollSubscriptions();
    const collection = new PCDCollection(packages);

    await applyActions(collection, actions);

    expect(collection.getSize()).to.eq(1);
  });
});
