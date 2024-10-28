import { EmailPCDPackage } from "@pcd/email-pcd";
import { PCDActionType, PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  v3tov4Identity
} from "@pcd/semaphore-identity-pcd";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { assert, expect } from "chai";
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

  const identity = new IdentityV3();

  this.beforeEach(() => {
    // Means that the time won't change during the test, which could cause
    // spurious issues with timestamps in feed credentials.
    MockDate.set(new Date());
  });

  this.afterEach(() => {
    MockDate.reset();
  });

  function setupTestManager(
    subs: { provider: string; feed: string }[]
  ): FeedSubscriptionManager {
    const manager = new FeedSubscriptionManager(new MockFeedApi());
    for (const sub of subs) {
      const providerUrl = "https://" + sub.provider;
      manager.getOrAddProvider(providerUrl, sub.provider);
      manager.subscribe(providerUrl, {
        description: "description of " + sub.feed,
        id: sub.feed,
        name: "name of " + sub.feed,
        permissions: [],
        inputPCDType: undefined,
        partialArgs: undefined,
        credentialRequest: {
          signatureType: "sempahore-signature-pcd"
        }
      });
    }

    expect(manager.getActiveSubscriptions()).to.have.length(subs.length);
    for (const sub of subs) {
      const providerUrl = "https://" + sub.provider;
      expect(manager.hasProvider(providerUrl)).to.be.true;
      expect(
        manager.getSubscriptionsByProviderAndFeedId(providerUrl, sub.feed)
      ).to.have.length(1);
    }
    return manager;
  }

  function expectAllTestSubs(
    mgr: FeedSubscriptionManager,
    subs: { provider: string; feed: string }[]
  ): void {
    for (const { provider, feed } of subs) {
      const subs1 = mgr.getSubscriptionsByProviderAndFeedId(
        "https://" + provider,
        feed
      );
      expect(subs1).to.have.length(1);
      expect(subs1[0].providerUrl).to.eq("https://" + provider);
      expect(subs1[0].feed.id).to.eq(feed);
    }
  }

  function expectSameSubs(
    mgr1: FeedSubscriptionManager,
    mgr2: FeedSubscriptionManager
  ): void {
    expect(mgr1.getActiveSubscriptions().length).to.eq(
      mgr2.getActiveSubscriptions().length
    );
    for (const sub1 of mgr1.getActiveSubscriptions()) {
      const subs2 = mgr2.getSubscriptionsByProviderAndFeedId(
        sub1.providerUrl,
        sub1.feed.id
      );
      expect(subs2).to.have.length(1);
      expect(subs2[0]).to.deep.eq(sub1);
    }
  }

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

  it("cloning should work", async function () {
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

    const sub = await manager.subscribe(providerUrl, feed);

    const action = {
      type: PCDActionType.ReplaceInFolder,
      folder: "TEST",
      pcds: [
        await SemaphoreIdentityPCDPackage.serialize(
          await SemaphoreIdentityPCDPackage.prove({
            identityV3: new IdentityV3()
          })
        )
      ]
    };

    manager.setError("1", {
      type: SubscriptionErrorType.PermissionError,
      actions: [action]
    });

    const cleanupListener = manager.updatedEmitter.listen(() => {
      assert.fail("Listener should never be called.");
    });

    expect(manager.getProviders()).to.have.length(1);
    expect(manager.getActiveSubscriptions()).to.have.length(1);
    expect(manager.getSubscription(sub.id)).to.not.be.undefined;

    const clone = manager.clone();

    expect(clone.getProviders()).to.deep.eq(manager.getProviders());
    expect(clone.getSubscriptionsByProvider()).to.deep.eq(
      manager.getSubscriptionsByProvider()
    );
    expectSameSubs(manager, clone);
    expect(clone.getAllErrors()).to.deep.eq(manager.getAllErrors());

    clone.unsubscribe(sub.id); // Would trigger listener if it were on the clone.
    cleanupListener();
  });

  it("merging unique data should work", async function () {
    // There are some collisions on provider ID, but all (provider, feed) pairs
    // are unique, so we expect all of them to be maintained in a merge.
    const entries1 = [
      { provider: "1", feed: "1A" },
      { provider: "1", feed: "1B" },
      { provider: "2", feed: "2A" }
    ];
    const mgr1 = setupTestManager(entries1);
    const entries2 = [
      { provider: "1", feed: "1C" },
      { provider: "B", feed: "B1" },
      { provider: "C", feed: "C1" },
      { provider: "C", feed: "2A" }
    ];
    const mgr2 = setupTestManager(entries2);
    const allSubs = [...entries1, ...entries2];

    expect(mgr1.merge(mgr2)).to.deep.eq({
      newProviders: 2,
      newSubscriptions: 4
    });
    expect(mgr1.getActiveSubscriptions()).to.have.length(allSubs.length);
    expectAllTestSubs(mgr1, allSubs);

    expect(mgr2.merge(mgr1)).to.deep.eq({
      newProviders: 1,
      newSubscriptions: 3
    });
    expect(mgr2.getActiveSubscriptions()).to.have.length(7);
    expectAllTestSubs(mgr2, allSubs);

    expectSameSubs(mgr1, mgr2);
  });

  it("merging should ignore duplicates", async function () {
    const mgr = setupTestManager([
      { provider: "1", feed: "1A" },
      { provider: "1", feed: "1B" },
      { provider: "2", feed: "2A" }
    ]);
    expect(mgr.getActiveSubscriptions()).to.have.length(3);

    // Self-merge should be a nop.
    expect(mgr.merge(mgr)).to.deep.eq({ newProviders: 0, newSubscriptions: 0 });
    expect(mgr.getActiveSubscriptions()).to.have.length(3);

    // Merge wth a clone should also be a nop.
    expect(mgr.merge(mgr.clone())).to.deep.eq({
      newProviders: 0,
      newSubscriptions: 0
    });
    expect(mgr.getActiveSubscriptions()).to.have.length(3);

    // Ignore duplicate feeds under the same provider.
    expect(
      mgr.merge(setupTestManager([{ provider: "1", feed: "1A" }]))
    ).to.deep.eq({
      newProviders: 0,
      newSubscriptions: 0
    });
    expect(mgr.getActiveSubscriptions()).to.have.length(3);

    // Allow duplicate feeds under a different provider.
    expect(
      mgr.merge(setupTestManager([{ provider: "3", feed: "1A" }]))
    ).to.deep.eq({
      newProviders: 1,
      newSubscriptions: 1
    });
    expect(mgr.getActiveSubscriptions()).to.have.length(4);

    // Ignore a duplicate subscription ID regardless of provider and feed.
    // Also ensuring that no provider is added if no subscription is added.
    const mgrWithDupId = setupTestManager([{ provider: "4", feed: "4A" }]);
    mgrWithDupId.getActiveSubscriptions()[0].id =
      mgr.getActiveSubscriptions()[0].id;
    expect(mgr.merge(mgrWithDupId)).to.deep.eq({
      newProviders: 0,
      newSubscriptions: 0
    });
    expect(mgr.getActiveSubscriptions()).to.have.length(4);
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
      semaphoreV4Id: {
        value: v3tov4Identity(identity).commitment.toString(),
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

    const collection = new PCDCollection([EmailPCDPackage], [emailPCD]);
    const credentialCache = createCredentialCache();
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

    const serializedEmailPCD = await EmailPCDPackage.serialize(emailPCD);
    // Make sure that the feed was able to decode the EmailPCD
    expect(mockFeedApi.receivedPayload?.pcd).to.deep.eq(undefined);
    expect(mockFeedApi.receivedPayload?.pcds).to.deep.eq([serializedEmailPCD]);
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

  it("feeds returning a 410 error should be flagged as 'ended'", async () => {
    // First verify that we have a working subscription
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

    const sub = await manager.subscribe(firstProviderUrl, firstFeed);
    const actions = await manager.pollSubscriptions(credentialManager);
    expect(actions.length).to.eq(1);

    // Now disable issuance
    mockFeedApi.issuanceDisabled = true;

    await manager.pollSubscriptions(credentialManager);
    // Our feed returned a 410 error, so it should be marked as 'ended'
    expect(manager.getSubscription(sub.id)?.ended).to.eq(true);

    mockFeedApi.issuanceDisabled = false;
  });
});
