import {
  FeedSubscriptionManager,
  Subscription,
  lemonadeDefaultSubscriptions,
  zupassDefaultSubscriptions
} from "@pcd/passport-interface";
import { appConfig } from "../src/appConfig";

const DEFAULT_FEED_URL = `${appConfig.zupassServer}/feeds`;
const DEFAULT_FEED_PROVIDER_NAME = "Zupass";
const DEFAULT_FEEDS = new Set(Object.keys(zupassDefaultSubscriptions));

// TODO: Update after we finish feeds on generic issuance
const LEMONADE_FEED_URL = "https://zupass.lemonade.social/tickets";
const LEMONADE_FEED_PROVIDER_NAME = "Lemonade";
const LEMONADE_FEEDS = new Set(Object.keys(lemonadeDefaultSubscriptions));

export function isDefaultSubscription(sub: Subscription): boolean {
  return (
    (sub.providerUrl === DEFAULT_FEED_URL && DEFAULT_FEEDS.has(sub.feed.id)) ||
    (sub.providerUrl === LEMONADE_FEED_URL && LEMONADE_FEEDS.has(sub.feed.id))
  );
}

export async function addDefaultSubscriptions(
  subscriptions: FeedSubscriptionManager
): Promise<void> {
  if (!subscriptions.hasProvider(DEFAULT_FEED_URL)) {
    subscriptions.addProvider(DEFAULT_FEED_URL, DEFAULT_FEED_PROVIDER_NAME);
  }

  if (!subscriptions.hasProvider(LEMONADE_FEED_URL)) {
    subscriptions.addProvider(LEMONADE_FEED_URL, LEMONADE_FEED_PROVIDER_NAME);
  }

  for (const id in zupassDefaultSubscriptions) {
    subscriptions.subscribe(
      DEFAULT_FEED_URL,
      zupassDefaultSubscriptions[id],
      // Replace the existing subscription if it already exists
      true
    );
  }

  for (const id in lemonadeDefaultSubscriptions) {
    subscriptions.subscribe(
      LEMONADE_FEED_URL,
      lemonadeDefaultSubscriptions[id],
      // Replace the existing subscription if it already exists
      true
    );
  }
}
