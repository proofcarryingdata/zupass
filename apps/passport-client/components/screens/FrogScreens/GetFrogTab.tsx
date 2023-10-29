import { EdDSAFrogPCD, EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
import { Subscription } from "@pcd/passport-interface";
import { Separator } from "@pcd/passport-ui";
import _ from "lodash";
import prettyMilliseconds from "pretty-ms";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useDispatch, usePCDCollection } from "../../../src/appHooks";
import { PCDCard } from "../../shared/PCDCard";
import { ActionButton } from "./Button";

export function GetFrogTab({
  subs,
  refetch
}: {
  subs: Subscription[];
  refetch: () => Promise<void>;
}) {
  const pcds = usePCDCollection();
  // NB: we cannot use useMemo because pcds are mutate in-place
  const frogPCDs = pcds
    .getAllPCDsInFolder("FrogCrypto")
    .filter(
      (pcd): pcd is EdDSAFrogPCD => pcd.type === EdDSAFrogPCDPackage.name
    );

  const [selectedPCDID, setSelectedPCDID] = useState("");
  const selectedPCD = useMemo(
    () => frogPCDs.find((pcd) => pcd.id === selectedPCDID) || frogPCDs[0],
    [frogPCDs, selectedPCDID]
  );
  const onPcdClick = useCallback((id: string) => {
    setSelectedPCDID(id);
  }, []);

  const [_lastestFrogPCD, setLatestFrogPCD] = useState<EdDSAFrogPCD>();
  useEffect(() => {
    const latest = _.maxBy(frogPCDs, (pcd) => pcd.claim.data.timestampSigned);
    if (latest) {
      setLatestFrogPCD((previous) => {
        if (previous && previous.id !== latest.id) {
          setSelectedPCDID(latest.id);
        }

        return latest;
      });
    }
  }, [frogPCDs]);

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
        {subs.map((sub) => (
          <SearchButton
            key={sub.id}
            sub={sub}
            refetch={refetch}
            setMessage={setSearchMessage}
          />
        ))}
      </SearchGroup>

      {searchMessage && <Notice>{searchMessage}</Notice>}

      {frogPCDs.length > 0 && (
        <>
          <Separator style={{ margin: 0 }} />
          <PCDContainer>
            {frogPCDs.map((pcd) => (
              <PCDCard
                key={pcd.id}
                pcd={pcd}
                onClick={onPcdClick}
                expanded={pcd.id === selectedPCD?.id}
              />
            ))}
          </PCDContainer>
        </>
      )}
    </>
  );
}

const SearchButton = ({
  sub: { id, feed, nextFetchAt },
  refetch,
  setMessage
}: {
  sub: Subscription & { nextFetchAt?: number };
  refetch: () => Promise<void>;
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
            refetch().then(resolve).catch(reject);
          },
          onError: (e) => refetch().finally(() => reject(e))
        });
      }),
    [dispatch, feed.name, id, refetch, setMessage]
  );
  const name = useMemo(() => _.upperCase(`Search ${feed.name}`), [feed.name]);

  return (
    <ActionButton key={id} onClick={onClick} disabled={!canFetch}>
      {canFetch ? name : `${name}${countDown}`}
    </ActionButton>
  );
};

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
    }, 1000);

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
