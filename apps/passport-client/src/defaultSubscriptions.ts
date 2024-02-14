import {
  FeedSubscriptionManager,
  Subscription,
  zupassDefaultSubscriptions
} from "@pcd/passport-interface";
import { appConfig } from "../src/appConfig";

const ZUPASS_FEED_URL = `${appConfig.zupassServer}/feeds`;
const ZUPASS_FEED_PROVIDER_NAME = "Zupass";
const ZUPASS_SERVER_FEEDS = new Set(Object.keys(zupassDefaultSubscriptions));

const DEFAULT_FEED_URLS = getDefaultFeedURLs();
const LEMONADE_LEGACY_FEED_URL_PREFIX =
  "https://zupass.lemonade.social/tickets";

function getDefaultFeedURLs(): string[] {
  const res = JSON.parse(process.env.DEFAULT_FEED_URLS || "[]");
  if (!Array.isArray(res) || res.some((e) => typeof e !== "string")) {
    console.error("DEFAULT_FEED_URLS must be an array of strings");
    return [];
  }
  return res;
}

export function isDefaultSubscription(sub: Subscription): boolean {
  return (
    (sub.providerUrl === ZUPASS_FEED_URL &&
      ZUPASS_SERVER_FEEDS.has(sub.feed.id)) ||
    DEFAULT_FEED_URLS.includes(sub.providerUrl)
  );
}

export async function addDefaultSubscriptions(
  subscriptions: FeedSubscriptionManager
): Promise<void> {
  if (!subscriptions.hasProvider(ZUPASS_FEED_URL)) {
    subscriptions.addProvider(ZUPASS_FEED_URL, ZUPASS_FEED_PROVIDER_NAME);
  }

  for (const id in zupassDefaultSubscriptions) {
    subscriptions.subscribe(
      ZUPASS_FEED_URL,
      zupassDefaultSubscriptions[id],
      // Replace the existing subscription if it already exists
      true
    );
  }

  for (const feedUrl of DEFAULT_FEED_URLS) {
    if (!subscriptions.hasProvider(feedUrl)) {
      const { feeds, providerName, providerUrl } =
        await subscriptions.listFeeds(feedUrl);
      subscriptions.addProvider(providerUrl, providerName);
      for (const feed of feeds) {
        subscriptions.subscribe(
          providerUrl,
          feed,
          // Replace the existing subscription if it already exists
          true
        );
      }
    }
  }

  // Unsubscribe from legacy Lemonade feeds, if they exist
  const legacyLemonadeProviders = subscriptions
    .getProviders()
    .filter((p) => p.providerUrl.startsWith(LEMONADE_LEGACY_FEED_URL_PREFIX));
  for (const { providerUrl } of legacyLemonadeProviders) {
    for (const sub of subscriptions.getSubscriptionsForProvider(providerUrl)) {
      subscriptions.unsubscribe(sub.id);
    }
    subscriptions.removeProvider(providerUrl);
  }
}
