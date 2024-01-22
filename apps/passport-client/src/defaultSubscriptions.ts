import {
  FeedSubscriptionManager,
  Subscription,
  ZupassFeedIds,
  zupassAutoUnsubscribeFeedIds,
  zupassDefaultSubscriptions
} from "@pcd/passport-interface";
import { appConfig } from "../src/appConfig";

const DEFAULT_FEED_URL = `${appConfig.zupassServer}/feeds`;
const DEFAULT_FEED_PROVIDER_NAME = "Zupass";

const DEFAULT_FEEDS = new Set(
  [
    ZupassFeedIds.Devconnect,
    ZupassFeedIds.Email,
    ZupassFeedIds.Zuzalu_23,
    ZupassFeedIds.Zuconnect_23
  ].map((s) => s.toString())
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

  for (const id in zupassDefaultSubscriptions) {
    subscriptions.subscribe(
      DEFAULT_FEED_URL,
      zupassDefaultSubscriptions[id],
      // Replace the existing subscription if it already exists
      true
    );
  }
}

/**
 * Unsubscribes from any feeds in `zupassAutoUnsubscribeFeedIds`.
 * For the sake of simpler user experience, we opted users in to subscribing
 * to feeds like Devconnect tickets. Now that these feeds are being deprecated,
 * we should automatically unsubscribe users from them.
 */
export function removeAutoUnsubscribedSubscriptions(
  subscriptions: FeedSubscriptionManager
) {
  for (const id of zupassAutoUnsubscribeFeedIds) {
    // In practice this returns an array of length 0 or length 1
    const matchingSubs = subscriptions.getSubscriptionsByProviderAndFeedId(
      DEFAULT_FEED_URL,
      id
    );
    // If the array had a subscription, unsubscribe
    for (const sub of matchingSubs) {
      subscriptions.unsubscribe(sub.id);
    }
  }
}
