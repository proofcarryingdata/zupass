import { isEdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import {
  CredentialManager,
  FrogCryptoFolderName,
  FrogCryptoUserStateResponseValue,
  Subscription,
  requestFrogCryptoGetUserState
} from "@pcd/passport-interface";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useCredentialCache,
  useIdentity,
  usePCDCollection,
  usePCDsInFolder,
  useSubscriptions
} from "../../../src/appHooks";
import { H1 } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { ActionButton, Button, ButtonGroup } from "./Button";
import { DexTab } from "./DexTab";
import { SuperFunkyFont } from "./FrogFolder";
import { GetFrogTab } from "./GetFrogTab";
import { ScoreTab, scoreToEmoji } from "./ScoreTab";
import { TypistText } from "./TypistText";
import { useInitializeFrogSubscriptions } from "./useFrogFeed";

const TABS = [
  {
    tab: "get",
    label: "get frogs"
  },
  {
    tab: "score",
    label: "hi scores"
  },
  {
    tab: "dex",
    label: "frogedex"
  }
] as const;
type TabId = (typeof TABS)[number]["tab"];

/**
 * Renders FrogCrypto UI including rendering all EdDSAFrogPCDs.
 */
export function FrogHomeSection() {
  const frogPCDs = usePCDsInFolder(FrogCryptoFolderName).filter(isEdDSAFrogPCD);
  const subs = useSubscriptions();
  const frogSubs = useMemo(
    () =>
      subs.value
        .getActiveSubscriptions()
        .filter((sub) => sub.providerUrl.includes("frogcrypto")),
    [subs]
  );
  const initFrog = useInitializeFrogSubscriptions();
  const [tab, setTab] = useState<TabId>("get");
  const { userState, refreshUserState } = useUserFeedState(frogSubs);
  const myScore = userState?.myScore?.score ?? 0;

  if (!userState) {
    return <RippleLoader />;
  }

  return (
    <Container>
      <SuperFunkyFont>
        <H1 style={{ margin: "0 auto" }}>{FrogCryptoFolderName}</H1>
      </SuperFunkyFont>

      {myScore > 0 && (
        <Score>
          Score {myScore} | {scoreToEmoji(myScore)}
        </Score>
      )}

      {frogSubs.length === 0 && (
        <TypistText
          onInit={(typewriter) =>
            typewriter
              .typeString(
                "you are walking through the ANATOLIAN WETLANDS when you chance upon an ominous, misty SWAMP.<br/><br/>"
              )
              .pauseFor(500)
              .typeString(
                "a sultry CROAK beckons you closer. it is like music to your ears.<br/><br/>"
              )
              .pauseFor(500)
              .typeString("will you enter the world of FROGCRYPTO?")
          }
        >
          <ActionButton onClick={initFrog}>enter SWAMP</ActionButton>
        </TypistText>
      )}

      {frogSubs.length > 0 &&
        (frogPCDs.length === 0 && !myScore ? (
          <>
            <TypistText
              onInit={(typewriter) =>
                typewriter
                  .typeString(
                    "you're certain you saw a frog wearing a monocle."
                  )
                  .pauseFor(500)
                  .changeDeleteSpeed(20)
                  .deleteAll()
                  .typeString("you enter the SWAMP.")
              }
            >
              <GetFrogTab
                subscriptions={frogSubs}
                userState={userState}
                refreshUserState={refreshUserState}
                pcds={frogPCDs}
              />
            </TypistText>
          </>
        ) : (
          <>
            {
              // show frog card on first pull
              // show tabs on second pull
              myScore >= 2 && (
                <ButtonGroup>
                  {TABS.map(({ tab: t, label }) => (
                    <Button
                      key={t}
                      disabled={tab === t}
                      onClick={() => setTab(t)}
                    >
                      {label}
                    </Button>
                  ))}
                </ButtonGroup>
              )
            }

            {tab === "get" && (
              <GetFrogTab
                subscriptions={frogSubs}
                userState={userState}
                refreshUserState={refreshUserState}
                pcds={frogPCDs}
              />
            )}
            {tab === "score" && <ScoreTab score={userState?.myScore} />}
            {tab === "dex" && (
              <DexTab possibleFrogs={userState.possibleFrogs} pcds={frogPCDs} />
            )}
          </>
        ))}
    </Container>
  );
}

/**
 * Fetch the user's frog crypto state as well as the ability to refetch.
 */
export function useUserFeedState(subscriptions: Subscription[]) {
  const [userState, setUserState] =
    useState<FrogCryptoUserStateResponseValue | null>(null);
  const identity = useIdentity();
  const pcds = usePCDCollection();
  const credentialCache = useCredentialCache();
  const credentialManager = useMemo(
    () => new CredentialManager(identity, pcds, credentialCache),
    [credentialCache, identity, pcds]
  );
  // coerce to string to avoid unnecessary rerenders
  const feedIdsString = useMemo(
    () => JSON.stringify(subscriptions.map((sub) => sub.feed.id)),
    [subscriptions]
  );
  const refreshUserState = useCallback(async () => {
    try {
      const pcd = await credentialManager.requestCredential({
        signatureType: "sempahore-signature-pcd"
      });

      const state = await requestFrogCryptoGetUserState(
        appConfig.zupassServer,
        {
          pcd,
          feedIds: JSON.parse(feedIdsString)
        }
      );

      if (state.error) {
        console.error("Failed to get user state", state.error);
        return;
      }

      setUserState(state.value);
    } catch (e) {
      console.error(e);
    }
  }, [credentialManager, feedIdsString]);
  useEffect(() => {
    refreshUserState();
  }, [refreshUserState]);

  return useMemo(
    () => ({
      userState,
      refreshUserState
    }),
    [userState, refreshUserState]
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  height: 100%;
  max-width: 100%;
  font-family: monospace;
  font-variant-numeric: tabular-nums;

  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const Score = styled.div`
  font-size: 16px;
  text-align: center;
`;
