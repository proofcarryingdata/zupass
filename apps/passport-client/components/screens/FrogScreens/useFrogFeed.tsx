import {
  Feed,
  FrogCryptoFolderName,
  IFrogCryptoClientFeedSchema,
  requestListFeeds
} from "@pcd/passport-interface";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import urljoin from "url-join";
import { validate } from "uuid";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useSubscriptions } from "../../../src/appHooks";
import { saveSubscriptions } from "../../../src/localstorage";

export const DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL = `${appConfig.frogCryptoServer}/frogcrypto/feeds`;

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
      saveSubscriptions(subs); // If the subscription was new, make sure it's saved.

      function parseAndAddFeed(feed: Feed, deeplink: boolean): boolean {
        // skip any feeds that are already subscribed to.
        // due to a merge conflict, we have users who have subscribed to a different feed provider url.
        // because frog feed is uuid, it is safe to compare across the feeds.
        if (
          subs.getActiveSubscriptions().find((sub) => sub.feed.id === feed.id)
        ) {
          return false;
        }

        const parsed = IFrogCryptoClientFeedSchema.safeParse(feed);
        if (parsed.success) {
          if (parsed.data.activeUntil > Date.now() / 1000) {
            // only add a feed if it is active
            dispatch({
              type: "add-subscription",
              providerUrl: DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL,
              providerName: FrogCryptoFolderName,
              feed
            });

            // don't show toast if feedId is specified
            if (!deeplink) {
              toast.success(
                `Croak and awe! The ${feed.name} awaits your adventurous leap!`,
                {
                  icon: "🏕️"
                }
              );
            }

            return true;
          } else if (deeplink) {
            // if we are adding an expired from deeplink, show error toast
            toast.error(
              <span>
                Oh no! You've found a secret froggy passage to{" "}
                <b>{feed.name}</b>. But our fireflies are in another castle.
                Maybe explore elsewhere and return here when the stars align?
              </span>
            );
            throw new Error("Feed no longer available");
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
        .forEach((feed) => parseAndAddFeed(feed, false));

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
            return parseAndAddFeed(feed, true) ? feed : null;
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
          setSearchParams(
            (prev) => {
              prev.delete("feedId");
              return prev;
            },
            {
              replace: true
            }
          );

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
          error: validate(feedId)
            ? "Seems like this froggy code is a tadpole off."
            : "We tried to look for this froggy code, but we got lost in the mist. Maybe come back after a few bug snacks?"
        }
      );
    }
  }, [feedId, initializeFrogSubscriptions, setSearchParams]);

  return initializeFrogSubscriptions;
}
