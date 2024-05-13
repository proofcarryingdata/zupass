import {
  FeedSubscriptionManager,
  Subscription,
  zupassDefaultSubscriptions
} from "@pcd/passport-interface";
import urljoin from "url-join";
import { appConfig } from "../src/appConfig";

export const ZUPASS_FEED_URL = urljoin(appConfig.zupassServer, "feeds");
const ZUPASS_FEED_PROVIDER_NAME = "Zupass";
const ZUPASS_SERVER_FEEDS = new Set(Object.keys(zupassDefaultSubscriptions));

const DEFAULT_FEED_URLS = getDefaultFeedURLs();
const LEMONADE_LEGACY_FEED_URL_PREFIX =
  "https://zupass.lemonade.social/tickets";

function getDefaultFeedURLs(): string[] {
  try {
    const res = JSON.parse(process.env.DEFAULT_FEED_URLS || "[]");
    if (!Array.isArray(res) || res.some((e) => typeof e !== "string")) {
      console.error("DEFAULT_FEED_URLS must be an array of strings");
      return [];
    }
    return res;
  } catch (e) {
    console.error(
      "failed to parse default feed urls",
      process.env.DEFAULT_FEED_URLS,
      e
    );
    return [];
  }
}

export function addZupassProvider(
  subscriptions: FeedSubscriptionManager
): void {
  if (!subscriptions.hasProvider(ZUPASS_FEED_URL)) {
    subscriptions.addProvider(ZUPASS_FEED_URL, ZUPASS_FEED_PROVIDER_NAME);
  }
}

export function isDefaultSubscription(sub: Subscription): boolean {
  return (
    (sub.providerUrl === ZUPASS_FEED_URL &&
      ZUPASS_SERVER_FEEDS.has(sub.feed.id)) ||
    DEFAULT_FEED_URLS.includes(sub.providerUrl)
  );
}

async function listAndSubscribeAll(
  feedUrl: string,
  subscriptions: FeedSubscriptionManager
): Promise<void> {
  const { feeds, providerName, providerUrl } =
    await subscriptions.listFeeds(feedUrl);

  if (!subscriptions.hasProvider(feedUrl)) {
    subscriptions.addProvider(providerUrl, providerName);
  }

  for (const feed of feeds) {
    subscriptions.subscribe(
      providerUrl,
      feed,
      // Replace the existing subscription if it already exists
      true
    );
  }
}

export async function addDefaultSubscriptions(
  subscriptions: FeedSubscriptionManager
): Promise<void> {
  addZupassProvider(subscriptions);

  for (const defaultSub of Object.values(zupassDefaultSubscriptions)) {
    subscriptions.subscribe(
      ZUPASS_FEED_URL,
      defaultSub,
      // Replace the existing subscription if it already exists
      true
    );
  }

  const subscriptionPromises = [];

  for (const feedUrl of DEFAULT_FEED_URLS) {
    // DEFAULT_FEED_URLS is a list of URLs to individual feeds
    // The reason we have to use URL strings is because Zupass doesn't know
    // about the feed objects in the way that it does for feeds that come from
    // the Zupass backend (see zupassDefaultSubscriptions above).
    //
    // In principle, multiple feeds can live at the same URL. In practice, we
    // do not do this for feeds served by Podbox (which is where all of the
    // feeds in DEFAULT_FEED_URLS come from). So, the final part of the URL is
    // always the feed ID. Given this, we can check to see if the user is
    // already subscribed to this feed: if so, we do not need to re-subscribe
    // them.
    const feedId = feedUrl.split("/").pop();
    if (
      feedId &&
      subscriptions.getSubscriptionsByProviderAndFeedId(feedUrl, feedId)
        .length === 1
    ) {
      continue;
    }

    // Asynchronously list the feeds and subscribe the user to them.
    subscriptionPromises.push(listAndSubscribeAll(feedUrl, subscriptions));
  }

  // Wait for subscriptions to have updated.
  await Promise.allSettled(subscriptionPromises);

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
