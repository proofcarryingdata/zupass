import {
  FeedSubscriptionManager,
  Subscription,
  zupassDefaultSubscriptions
} from "@pcd/passport-interface";
import { appConfig } from "../src/appConfig";

const DEFAULT_FEED_URL = `${appConfig.zupassServer}/feeds`;
const DEFAULT_FEED_PROVIDER_NAME = "Zupass";

const DEFAULT_FEEDS = new Set(Object.keys(zupassDefaultSubscriptions));

export function isDefaultSubscription(sub: Subscription): boolean {
  return sub.providerUrl === DEFAULT_FEED_URL && DEFAULT_FEEDS.has(sub.feed.id);
}

export async function addDefaultSubscriptions(
  subscriptions: FeedSubscriptionManager
): Promise<void> {
  if (!subscriptions.hasProvider(DEFAULT_FEED_URL)) {
    subscriptions.addProvider(DEFAULT_FEED_URL, DEFAULT_FEED_PROVIDER_NAME);
  }

  for (const id in zupassDefaultSubscriptions) {
    subscriptions.subscribe(
      DEFAULT_FEED_URL,
      zupassDefaultSubscriptions[id],
      // Replace the existing subscription if it already exists
      true
    );
  }
}
