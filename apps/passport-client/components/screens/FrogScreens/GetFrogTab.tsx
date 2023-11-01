import { EdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import {
  FrogCryptoUserStateResponseValue,
  Subscription
} from "@pcd/passport-interface";
import { Separator } from "@pcd/passport-ui";
import _ from "lodash";
import prettyMilliseconds from "pretty-ms";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useDispatch } from "../../../src/appHooks";
import { PCDCard } from "../../shared/PCDCard";
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
  const [searchMessage, setSearchMessage] = useState("");
  useEffect(() => {
    if (searchMessage) {
      const timeout = setTimeout(() => {
        setSearchMessage("");
      }, 5000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [searchMessage]);

  return (
    <>
      <SearchGroup>
        {subscriptions.map((sub) => (
          <SearchButton
            key={sub.id}
            sub={sub}
            refreshUserState={refreshUserState}
            setMessage={setSearchMessage}
            nextFetchAt={
              userState?.feeds?.find((feed) => feed.feedId === sub.feed.id)
                ?.nextFetchAt
            }
          />
        ))}
      </SearchGroup>

      {searchMessage !== "" && <Notice>{searchMessage}</Notice>}

      {pcds.length > 0 && (
        <>
          <Separator style={{ margin: 0 }} />
          <PCDContainer>
            {pcds.map((pcd) => (
              <PCDCard key={pcd.id} pcd={pcd} expanded />
            ))}
          </PCDContainer>
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
  refreshUserState,
  setMessage
}: {
  sub: Subscription;
  nextFetchAt?: number;
  refreshUserState: () => Promise<void>;
  setMessage: (message: string) => void;
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
            setMessage(`You found a new frog in ${feed.name}!`);
            refreshUserState().then(resolve).catch(reject);
          },
          onError: (e) => refreshUserState().finally(() => reject(e))
        });
      }),
    [dispatch, feed.name, id, refreshUserState, setMessage]
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
  const [diffText, setDiffText] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = Math.ceil((end.getTime() - now.getTime()) / 1000) * 1000;
      if (diffMs <= 0) {
        setDiffText("");
      } else {
        const diffString = prettyMilliseconds(diffMs, {
          millisecondsDecimalDigits: 0,
          secondsDecimalDigits: 0,
          unitCount: 4
        });
        setDiffText(diffString);
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [end]);

  return diffText ? ` (wait ${diffText})` : "";
}

const PCDContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SearchGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-direction: column;
`;

const Notice = styled.div`
  text-align: center;
`;
