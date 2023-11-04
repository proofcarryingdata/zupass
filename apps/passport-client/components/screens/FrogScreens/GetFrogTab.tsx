import { EdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import {
  FrogCryptoUserStateResponseValue,
  Subscription
} from "@pcd/passport-interface";
import { Separator } from "@pcd/passport-ui";
import _ from "lodash";
import prettyMilliseconds from "pretty-ms";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import styled from "styled-components";
import { useDispatch } from "../../../src/appHooks";
import { PCDCardList } from "../../shared/PCDCardList";
import { ActionButton } from "./Button";

/**
 * The GetFrog tab allows users to get frogs from their subscriptions as well as view their frogs.
 */
export function GetFrogTab({
  pcds,
  userState,
  subscriptions,
  refreshUserState
}: {
  pcds: EdDSAFrogPCD[];
  userState: FrogCryptoUserStateResponseValue;
  subscriptions: Subscription[];
  refreshUserState: () => Promise<void>;
}) {
  // TODO: filter seach button to show only active subscriptions
  // TODO: surface a maintenance message if all subscriptions are inactive
  return (
    <>
      <SearchGroup>
        {subscriptions.map((sub) => {
          const userFeedState = userState?.feeds?.find(
            (feed) => feed.feedId === sub.feed.id
          );

          if (userFeedState?.active === false) {
            return null;
          }

          return (
            <SearchButton
              key={sub.id}
              sub={sub}
              refreshUserState={refreshUserState}
              nextFetchAt={userFeedState?.nextFetchAt}
            />
          );
        })}
      </SearchGroup>

      {pcds.length > 0 && (
        <>
          <Separator style={{ margin: 0 }} />
          <PCDCardList
            pcds={pcds}
            defaultSortState={{
              sortBy: "index",
              sortOrder: "desc"
            }}
            allExpanded
          />
        </>
      )}
    </>
  );
}

/**
 * Button to get a frog from a feed. It calls refreshUserState after each
 * request to ensure cooldown is updated.
 */
const SearchButton = ({
  sub: { id, feed },
  nextFetchAt,
  refreshUserState
}: {
  sub: Subscription;
  nextFetchAt?: number;
  refreshUserState: () => Promise<void>;
}) => {
  const dispatch = useDispatch();
  const countDown = useCountDown(nextFetchAt || 0);
  const canFetch = !nextFetchAt || nextFetchAt < Date.now();

  const onClick = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        dispatch({
          type: "sync-subscription",
          subscriptionId: id,
          onSucess: () => {
            // FIXME: sync-subscription swallows http errors and always resolve as success
            toast(`You found a new frog in ${feed.name}!`, {
              icon: "🐸"
            });
            refreshUserState().then(resolve).catch(reject);
          },
          onError: (e) => refreshUserState().finally(() => reject(e))
        });
      }),
    [dispatch, feed.name, id, refreshUserState]
  );
  const name = useMemo(() => _.upperCase(`Search ${feed.name}`), [feed.name]);

  return (
    <ActionButton key={id} onClick={onClick} disabled={!canFetch}>
      {canFetch ? name : `${name}${countDown}`}
    </ActionButton>
  );
};

/**
 * Takes a future timestamp and returns a " (wait X)" string where X is a human
 * readable duration until the timestamp. Returns an empty string if the
 * timestamp is in the past.
 */
function useCountDown(timestamp: number) {
  const end = useMemo(() => new Date(timestamp), [timestamp]);
  const getDiffText = useCallback((end: Date) => {
    const now = new Date();
    const diffMs = Math.ceil((end.getTime() - now.getTime()) / 1000) * 1000;
    if (diffMs <= 0) {
      return "";
    } else {
      const diffString = prettyMilliseconds(diffMs, {
        millisecondsDecimalDigits: 0,
        secondsDecimalDigits: 0,
        unitCount: 4
      });
      return diffString;
    }
  }, []);
  const [diffText, setDiffText] = useState(() => getDiffText(end));

  useEffect(() => {
    const interval = setInterval(() => setDiffText(getDiffText(end)), 500);

    return () => {
      clearInterval(interval);
    };
  }, [end, getDiffText]);

  return diffText ? ` (wait ${diffText})` : "";
}

const SearchGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-direction: column;
`;
