import {
  FeedSubscriptionManager,
  Subscription,
  ZupassFeedIds
} from "@pcd/passport-interface";
import { appConfig } from "../src/appConfig";

const DEFAULT_FEED_URL = `${appConfig.zupassServer}/feeds`;
const DEFAULT_FEED_PROVIDER_NAME = "Zupass";

const DEFAULT_FEEDS = new Set(
  [ZupassFeedIds.Devconnect, ZupassFeedIds.Email, ZupassFeedIds.Zuzalu_1].map(
    (s) => s.toString()
  )
);

export function isDefaultSubscription(sub: Subscription): boolean {
  return sub.providerUrl === DEFAULT_FEED_URL && DEFAULT_FEEDS.has(sub.feed.id);
}

export async function addDefaultSubscriptions(
  subscriptions: FeedSubscriptionManager
) {
  if (!subscriptions.hasProvider(DEFAULT_FEED_URL)) {
    subscriptions.addProvider(DEFAULT_FEED_URL, DEFAULT_FEED_PROVIDER_NAME);
  }

  const subscribedFeedIds = new Set(
    subscriptions
      .getSubscriptionsForProvider(DEFAULT_FEED_URL)
      .map((s) => s.feed.id)
  );

  const difference = [...DEFAULT_FEEDS].filter(
    (id) => !subscribedFeedIds.has(id)
  );

  if (difference.length > 0) {
    try {
      const list = await subscriptions.listFeeds(DEFAULT_FEED_URL);

      for (const feed of list.feeds) {
        if (DEFAULT_FEEDS.has(feed.id)) {
          subscriptions.subscribe(DEFAULT_FEED_URL, feed);
        }
      }
    } catch (e) {
      console.log("Could not add default subscriptions due to error:", e);
    }
  }
}
