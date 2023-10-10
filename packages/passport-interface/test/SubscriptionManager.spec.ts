import { EmailPCDPackage } from "@pcd/email-pcd";
import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import MockDate from "mockdate";
import {
  CredentialManager,
  createCredentialCache
} from "../src/CredentialManager";
import {
  Feed,
  FeedSubscriptionManager,
  SubscriptionErrorType
} from "../src/SubscriptionManager";
import { MockFeedApi } from "./MockFeedApi";

describe("Subscription Manager", async function () {
  const mockFeedApi = new MockFeedApi();
  const PROVIDER_NAME = "Mock Provider";

  const identity = new Identity();

  this.timeout(1000 * 30);

  this.beforeEach(() => {
    // Means that the time won't change during the test, which could cause
    // spurious issues with timestamps in feed credentials.
    MockDate.set(new Date());
  });

  this.afterEach(() => {
    MockDate.reset();
  });

  it("keeping track of providers should work", async function () {
    const manager = new FeedSubscriptionManager(mockFeedApi);

    const providerUrl = "test url";
    manager.addProvider(providerUrl, PROVIDER_NAME);
    expect(manager.getProviders().length).to.eq(1);
    expect(manager.getProviders().map((p) => p.providerUrl)).to.deep.eq([
      providerUrl
    ]);
    manager.removeProvider(providerUrl);
    expect(manager.getProviders().length).to.eq(0);
  });

  it("keeping track of subscriptions should work", async function () {
    const manager = new FeedSubscriptionManager(mockFeedApi);

    const providerUrl = "test url";
    manager.addProvider(providerUrl, PROVIDER_NAME);

    const feed: Feed = {
      description: "description",
      id: "1",
      name: "test feed",
      permissions: [],
      inputPCDType: undefined,
      partialArgs: undefined,
      credentialRequest: {
        signatureType: "sempahore-signature-pcd"
      }
    };

    const sub = await manager.subscribe(providerUrl, feed, undefined);

    expect(manager.getActiveSubscriptions().length).to.eq(1);
    expect(manager.getSubscription(sub.id)).to.deep.eq(sub);

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

    // Replacing an existing feed with an updated version
    feed.name = "changed name";
    const sameSub = await manager.subscribe(providerUrl, feed, true);
    expect(sub).to.eq(sameSub);
    expect(manager.getActiveSubscriptions().length).to.eq(1);

    manager.unsubscribe(sub.id);
    expect(manager.getActiveSubscriptions().length).to.eq(0);
    expect(manager.getProviders().length).to.eq(0);
  });

  it("serialization and deserialization should work", async function () {
    const manager = new FeedSubscriptionManager(mockFeedApi);

    const providerUrl = "test url";
    manager.addProvider(providerUrl, PROVIDER_NAME);

    const feed: Feed = {
      description: "description",
      id: "1",
      name: "test feed",
      permissions: [],
      inputPCDType: undefined,
      partialArgs: undefined,
      credentialRequest: {
        signatureType: "sempahore-signature-pcd"
      }
    };

    await manager.subscribe(providerUrl, feed, undefined);

    const serialized = manager.serialize();
    const deserialized = FeedSubscriptionManager.deserialize(
      mockFeedApi,
      serialized
    );

    expect(manager.getProviders()).to.deep.eq(deserialized.getProviders());
    expect(manager.getActiveSubscriptions().length).to.eq(
      deserialized.getActiveSubscriptions().length
    );

    for (let i = 0; i < manager.getActiveSubscriptions().length; i++) {
      const l = manager.getActiveSubscriptions()[0];
      const r = deserialized.getActiveSubscriptions()[0];

      expect(l.feed.description).to.eq(r.feed.description);
      expect(l.feed.id).to.eq(r.feed.id);
      expect(l.feed.name).to.eq(r.feed.name);
      expect(l.feed.permissions).to.deep.eq(r.feed.permissions);
      expect(l.providerUrl).to.eq(r.providerUrl);
      expect(l.subscribedTimestamp).to.eq(r.subscribedTimestamp);
    }
  });

  it("listing feeds over network should work", async () => {
    const manager = new FeedSubscriptionManager(mockFeedApi);
    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    const feeds = (await manager.listFeeds(firstProviderUrl)).feeds;
    expect(feeds.length).to.eq(3);
  });

  it("polling feeds over network should work", async () => {
    const manager = new FeedSubscriptionManager(mockFeedApi);
    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const feeds = (await manager.listFeeds(firstProviderUrl)).feeds;
    const firstFeed = feeds[0];

    const collection = new PCDCollection([]);
    const credentialCache = await createCredentialCache();
    const credentialManager = new CredentialManager(
      identity,
      collection,
      credentialCache
    );

    await manager.subscribe(firstProviderUrl, firstFeed);
    const actions = await manager.pollSubscriptions(credentialManager);
    expect(actions.length).to.eq(1);
    expect(mockFeedApi.receivedPayload?.pcd).to.be.undefined;
    expect(mockFeedApi.receivedPayload?.timestamp).to.not.be.undefined;
  });

  it("email PCD credentials should work", async () => {
    const manager = new FeedSubscriptionManager(mockFeedApi);
    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const feeds = (await manager.listFeeds(firstProviderUrl)).feeds;
    const credentialFeed = feeds[2];

    const prvKey =
      "0001020304050607080900010203040506070809000102030405060708090001";

    const emailPCD = await EmailPCDPackage.prove({
      emailAddress: {
        argumentType: ArgumentTypeName.String,
        value: "test@example.com"
      },
      semaphoreId: {
        value: identity.getCommitment().toString(),
        argumentType: ArgumentTypeName.String
      },
      privateKey: {
        value: prvKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: undefined,
        argumentType: ArgumentTypeName.String
      }
    });

    const serializedPCD = await EmailPCDPackage.serialize(emailPCD);

    const collection = new PCDCollection([EmailPCDPackage], [emailPCD]);
    const credentialCache = await createCredentialCache();
    const credentialManager = new CredentialManager(
      identity,
      collection,
      credentialCache
    );

    // In passport-client we would be persisting this serialized PCD to
    // local and e2ee storage
    const sub = await manager.subscribe(firstProviderUrl, credentialFeed);

    // When polling a subscription, the serialized PCD will be encoded in the
    // signed message of a SemaphoreSignaturePCD
    const actions = await manager.pollSingleSubscription(
      sub,
      credentialManager
    );
    expect(actions.length).to.eq(1);
    // Make sure that the feed was able to decode the EmailPCD
    expect(mockFeedApi.receivedPayload?.pcd).to.deep.eq(serializedPCD);
    expect(mockFeedApi.receivedPayload?.timestamp).to.not.be.undefined;
  });

  it("feeds should record permission errors during polling", async () => {
    const manager = new FeedSubscriptionManager(mockFeedApi);
    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const feeds = (await manager.listFeeds(firstProviderUrl)).feeds;
    const badFeed = feeds[1];

    const collection = new PCDCollection([]);
    const credentialCache = await createCredentialCache();
    const credentialManager = new CredentialManager(
      identity,
      collection,
      credentialCache
    );

    const { id } = await manager.subscribe(firstProviderUrl, badFeed);
    const actions = await manager.pollSubscriptions(credentialManager);
    expect(actions.length).to.eq(1);
    const error = manager.getError(id);
    expect(error).to.deep.contain({
      type: SubscriptionErrorType.PermissionError
    });
  });

  it("credential generation caching should work", async () => {
    const manager = new FeedSubscriptionManager(mockFeedApi);
    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const feeds = (await manager.listFeeds(firstProviderUrl)).feeds;
    const firstFeed = feeds[0];

    // October 9th, 2023, 15:00:00
    const firstDate = new Date(2023, 10, 9, 15, 0, 0, 0);
    const secondDate = new Date(2023, 10, 9, 15, 30, 0, 0);
    const thirdDate = new Date(2023, 10, 9, 16, 0, 0, 0);
    MockDate.set(firstDate);

    const collection = new PCDCollection([]);
    const credentialCache = await createCredentialCache();
    const credentialManager = new CredentialManager(
      identity,
      collection,
      credentialCache
    );

    await manager.subscribe(firstProviderUrl, firstFeed);
    await manager.pollSubscriptions(credentialManager);
    expect(mockFeedApi.receivedPayload?.timestamp).to.eq(firstDate.getTime());

    MockDate.set(secondDate);
    await manager.pollSubscriptions(credentialManager);
    // Most recent payload timestamp should not have changed, due to cached
    // credential
    expect(mockFeedApi.receivedPayload?.timestamp).to.eq(firstDate.getTime());

    MockDate.set(thirdDate);
    await manager.pollSubscriptions(credentialManager);
    // But now it should have happened, as the original credential expired
    expect(mockFeedApi.receivedPayload?.timestamp).to.eq(thirdDate.getTime());
  });
});
