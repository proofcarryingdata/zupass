import { Feed } from "@pcd/passport-interface";
import { ReactNode, useEffect, useState } from "react";
import { useSubscriptions } from "../../../src/appHooks";
import { SubscriptionInfoRow } from "../AddSubscriptionScreen";

enum FeedFetchStates {
  Idle,
  Fetching,
  Fetched
}

type FeedFetch =
  | {
      state: FeedFetchStates.Idle;
    }
  | {
      state: FeedFetchStates.Fetching;
    }
  | {
      state: FeedFetchStates.Fetched;
      success: true;
      feeds: Feed[];
      providerUrl: string;
      providerName: string;
    }
  | {
      state: FeedFetchStates.Fetched;
      success: false;
      error: string;
    };

export function EmbeddedAddSubscription({
  feedUrl,
  feedId
}: {
  feedUrl: string;
  feedId: string;
}): ReactNode {
  const [feedFetch, setFeedFetch] = useState<FeedFetch>({
    state: FeedFetchStates.Idle
  });
  const { value: subs } = useSubscriptions();
  useEffect(() => {
    if (feedFetch.state === FeedFetchStates.Fetching) {
      return;
    }

    setFeedFetch({ state: FeedFetchStates.Fetching });

    subs
      .listFeeds(feedUrl)
      .then((response) => {
        setFeedFetch({
          state: FeedFetchStates.Fetched,
          success: true,
          feeds: response.feeds,
          providerName: response.providerName,
          providerUrl: response.providerUrl
        });
      })
      .catch((e) => {
        console.log(`error fetching subscription infos ${e}`);
        setFeedFetch({
          state: FeedFetchStates.Fetched,
          success: false,
          error:
            "Unable to fetch subscriptions. Check that the URL is correct, or try again later."
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (feedFetch.state === FeedFetchStates.Idle) {
    return <div>Fetching feeds...</div>;
  } else if (feedFetch.state === FeedFetchStates.Fetching) {
    return <div>Fetching feeds...</div>;
  } else if (feedFetch.state === FeedFetchStates.Fetched && feedFetch.success) {
    const feed = feedFetch.feeds.find((f) => f.id === feedId);
    if (!feed) {
      return <div>Feed not found</div>;
    }
    return (
      <SubscriptionInfoRow
        subscriptions={subs}
        providerUrl={feedFetch.providerUrl}
        providerName={feedFetch.providerName}
        info={feed}
        showErrors={false}
        isDeepLink={false}
        isExpanded={true}
      />
    );
  } else if (
    feedFetch.state === FeedFetchStates.Fetched &&
    !feedFetch.success
  ) {
    return <div>{feedFetch.error}</div>;
  }
}
