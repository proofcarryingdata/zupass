import { expect } from "chai";
import { Feed, SubscriptionManager } from "../src";

describe("Subscription Manager", async function () {
  it("providers should work", async function () {
    const manager = new SubscriptionManager([], []);

    const providerUrl = "test url";
    manager.addProvider(providerUrl);
    expect(manager.getProviders().length).to.eq(1);
    expect(manager.getProviders().map((p) => p.providerUrl)).to.deep.eq([
      providerUrl
    ]);
    manager.removeProvider(providerUrl);
    expect(manager.getProviders().length).to.eq(0);
  });

  it("subscriptions should work", async function () {
    const manager = new SubscriptionManager([], []);

    const providerUrl = "test url";
    manager.addProvider(providerUrl);

    const feed: Feed = {
      description: "description",
      id: "1",
      name: "test feed",
      permissions: [],
      inputPCDType: undefined,
      partialArgs: undefined
    };

    manager.subscribe(providerUrl, feed, undefined);

    expect(manager.getActiveSubscriptions().length).to.eq(1);
    const sub = manager.getSubscription(providerUrl, feed.id);

    expect(sub?.credential).to.eq(undefined);
    expect(sub?.providerUrl).to.eq(providerUrl);
    expect(sub?.subscribedTimestamp).to.not.eq(undefined);

    expect(sub?.feed.description).to.eq(feed.description);
    expect(sub?.feed.id).to.eq(feed.id);
    expect(sub?.feed.name).to.eq(feed.name);
    expect(sub?.feed.permissions).to.deep.eq(feed.permissions);
    expect(sub?.feed.inputPCDType).to.eq(feed.inputPCDType);
    expect(sub?.feed.partialArgs).to.deep.eq(feed.partialArgs);

    const subs = manager.getSubscriptionsForProvider(providerUrl);
    expect(subs).to.deep.eq([sub]);

    manager.unsubscribe(providerUrl, feed.id);
    expect(manager.getActiveSubscriptions().length).to.eq(0);
    expect(manager.getProviders().length).to.eq(0);
  });
});
