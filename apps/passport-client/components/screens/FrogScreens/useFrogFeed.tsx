import {
  Feed,
  FrogCryptoFolderName,
  IFrogCryptoFeedSchema,
  requestListFeeds
} from "@pcd/passport-interface";
import { useCallback, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import urljoin from "url-join";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useSubscriptions } from "../../../src/appHooks";

export const DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL = `${appConfig.zupassServer}/frogcrypto/feeds`;

/**
 * Returns a callback to register the default frog subscription provider and
 * subscribes to all public frog feeds and optionally a specific feed.
 */
export function useInitializeFrogSubscriptions(): (
  feedId?: string
) => Promise<Feed | null> {
  const dispatch = useDispatch();
  const { value: subs } = useSubscriptions();

  const initializeFrogSubscriptions = useCallback(
    async (feedId?: string): Promise<Feed | null> => {
      subs.getOrAddProvider(
        DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL,
        FrogCryptoFolderName
      );

      function parseAndAddFeed(feed: Feed): boolean {
        // skip any feeds that are already subscribed to
        if (
          subs.getSubscriptionsByProviderAndFeedId(
            DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL,
            feed.id
          ).length > 0
        ) {
          return false;
        }

        const parsed = IFrogCryptoFeedSchema.safeParse(feed);
        if (parsed.success) {
          dispatch({
            type: "add-subscription",
            providerUrl: DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL,
            providerName: FrogCryptoFolderName,
            feed
          });

          if (parsed.data.activeUntil > Date.now() / 1000) {
            // don't show toast if feedId is specified
            if (feed.id !== feedId) {
              toast.success(
                `Croak and awe! The ${feed.name} awaits your adventurous leap!`,
                {
                  icon: "🏕️"
                }
              );
            }

            return true;
          }
        } else {
          console.error(
            "Failed to parse feed as FrogFeed",
            feed,
            parsed["error"]
          );
        }

        return false;
      }

      const { feeds } = await subs.listFeeds(
        DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL
      );
      if (!feedId && feeds.length === 0) {
        toast.error(
          "Hop, hop, hooray! But wait – the adventure isn't ready to ignite just yet. The fireflies haven't finished their dance. Come back shortly, and we'll leap into the fun together!"
        );
        return null;
      }
      feeds
        // remove any feeds that we want to custom add
        .filter((feed) => feed.id !== feedId)
        .forEach(parseAndAddFeed);

      if (feedId) {
        try {
          const res = await requestListFeeds(
            urljoin(
              DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL,
              encodeURIComponent(feedId)
            )
          );
          const feed = res?.value?.feeds?.[0];
          if (feed) {
            return parseAndAddFeed(feed) ? feed : null;
          } else {
            throw new Error(res?.error || "Feed not found");
          }
        } catch (e) {
          console.error("Failed to fetch feed", feedId, e);
          throw new Error("Unable to fetch feed");
        }
      }

      return null;
    },
    [dispatch, subs]
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const feedId = useMemo(() => {
    const param = searchParams.get("feedId");
    return param ? decodeURIComponent(param) : null;
  }, [searchParams]);
  useEffect(() => {
    if (feedId) {
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 3000)).then(() => {
          setSearchParams((prev) => {
            prev.delete("feedId");
            return prev;
          });

          return initializeFrogSubscriptions(feedId);
        }),
        {
          loading:
            "Unearthing hidden paths and mystical biomes! Brace yourself for a leap into wonder. Hold on to your lily pads...",
          success: (feed: Feed | null) =>
            feed ? (
              <span>
                Leapin' lily pads! You've found a secret froggy passage to{" "}
                <b>{feed.name}</b>. New adventures are just a hop away.
              </span>
            ) : (
              <>You look familiar. Have we met before? No need to leap again.</>
            ),
          error: "Seems like this froggy code is a tadpole tad off."
        }
      );
    }
  }, [feedId, initializeFrogSubscriptions, setSearchParams]);

  return initializeFrogSubscriptions;
}
