import { isEdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import {
  Feed,
  FrogCryptoFolderName,
  FrogCryptoUserStateResponseValue,
  Subscription,
  requestFrogCryptoGetUserState
} from "@pcd/passport-interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { TypewriterClass } from "typewriter-effect";
import { appConfig } from "../../../src/appConfig";
import {
  useCredentialManager,
  usePCDsInFolder,
  useSubscriptions
} from "../../../src/appHooks";
import { H1 } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { ActionButton, Button, ButtonGroup } from "./Button";
import { Countdown } from "./Countdown";
import { DexTab } from "./DexTab";
import { SuperFunkyFont } from "./FrogFolder";
import {
  FROM_SUBSCRIPTION_PARAM_KEY,
  useCheatCodeActivation
} from "./FrogSubscriptionScreen";
import { GetFrogTab } from "./GetFrogTab";
import { TypistText } from "./TypistText";
import { useInitializeFrogSubscriptions } from "./useFrogFeed";

const TABS = [
  {
    tab: "get",
    label: "get frogs"
  },
  // turned off for edge city denver - score is traced in the ECD folder.
  // {
  //   tab: "score",
  //   label: "hi scores"
  // },
  {
    tab: "dex",
    label: "frogedex"
  }
] as const;
type TabId = (typeof TABS)[number]["tab"];

/**
 * Renders FrogCrypto UI including rendering all EdDSAFrogPCDs.
 */
export function FrogCryptoHomeSection({
  setBrowsingFolder
}: {
  setBrowsingFolder: (folder: string | undefined, tab?: string) => void;
}): JSX.Element {
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

  const [searchParams, setSearchParams] = useSearchParams();
  const isFromSubscriptionRef = useRef<boolean>(
    !!searchParams.get(FROM_SUBSCRIPTION_PARAM_KEY)
  );
  const retreatRef = useRef<boolean>(false);
  useEffect(() => {
    if (isFromSubscriptionRef.current) {
      setSearchParams(
        (prev) => {
          prev.delete(FROM_SUBSCRIPTION_PARAM_KEY);
          return prev;
        },
        { replace: true }
      );
    }
  }, [setSearchParams]);

  useCheatCodeActivation();

  const [buttonRef, setButtonRef] = useState<HTMLButtonElement>();

  if (!userState) {
    return <RippleLoader />;
  }

  return (
    <Container>
      <SuperFunkyFont>
        <H1 style={{ margin: "0 auto" }}>{FrogCryptoFolderName}</H1>
      </SuperFunkyFont>

      <Countdown />

      {/* Score is disabled for frog crypto because it's vieweable in the edge city folder */}
      {/* {myScore > 0 && (
        <Score>
          Score {myScore} | {scoreToEmoji(myScore)}
        </Score>
      )} */}

      {frogSubs.length === 0 && (
        <TypistText
          onInit={(typewriter): TypewriterClass =>
            typewriter
              .typeString(
                isFromSubscriptionRef.current
                  ? "a mysterious QR code portals you to the DENVER HIGHLANDS when you chance upon an ominous, misty SWAMP.<br/><br/>"
                  : "you are walking through the DENVER HIGHLANDS when you chance upon an ominous, misty SWAMP.<br/><br/>"
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
          {
            // frog holders cannot retreat
            frogPCDs.length === 0 && !myScore && (
              <ActionButton
                onClick={(): Promise<Feed | null> => {
                  retreatRef.current = true;
                  return initFrog();
                }}
              >
                retreat
              </ActionButton>
            )
          }
        </TypistText>
      )}

      {frogSubs.length > 0 &&
        (frogPCDs.length === 0 && !myScore ? (
          <>
            <TypistText
              onInit={(typewriter): TypewriterClass => {
                const text = isFromSubscriptionRef.current
                  ? `you hear a whisper. "come back again when you're stronger."`
                  : "you're certain you saw a frog wearing a monocle.";

                return typewriter
                  .typeString(text)
                  .pauseFor(500)
                  .changeDeleteSpeed(20)
                  .deleteChars(text.length)
                  .typeString(
                    retreatRef.current
                      ? "retreat was ineffective. you enter the SWAMP."
                      : "you enter the SWAMP."
                  );
              }}
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
                <>
                  <ButtonGroup>
                    <EdgeCityButton
                      ref={(r): void => setButtonRef(r)}
                      onClick={(): void => {
                        buttonRef.classList?.add("big");
                        buttonRef.innerText = "";
                        buttonRef.style.border = "none";
                        buttonRef.style.color = "transparent";

                        setTimeout(() => {
                          setBrowsingFolder("Edge City", "experiences");
                        }, 200);
                      }}
                    >
                      EDGE CITY
                    </EdgeCityButton>
                  </ButtonGroup>
                  <ButtonGroup>
                    {TABS.map(({ tab: t, label }) => (
                      <Button
                        key={t}
                        disabled={tab === t}
                        onClick={(): void => setTab(t)}
                      >
                        {label}
                      </Button>
                    ))}
                  </ButtonGroup>
                </>
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
            {/* {tab === "score" && (
              <ScoreTab
                score={userState?.myScore}
                refreshScore={refreshUserState}
              />
            )} */}
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
export function useUserFeedState(subscriptions: Subscription[]): {
  userState: FrogCryptoUserStateResponseValue;
  refreshUserState: () => Promise<void>;
} {
  const [userState, setUserState] =
    useState<FrogCryptoUserStateResponseValue | null>(null);
  const credentialManager = useCredentialManager();
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Score = styled.div`
  font-size: 16px;
  text-align: center;
`;

const EdgeCityButton = styled(Button)`
  background-color: black;
  border: 1px solid #ababab;
  font-family: PressStart2P;
  filter: drop-shadow(5px 5px 10px #484848);
  transition: 300ms;

  &:hover {
    filter: drop-shadow(5px 5px 20px #484848);
    transform: scale(1.1);
    padding: 10px;

    &:active {
      transform: scale(1.2);
      padding: 16px;
    }
  }

  &.big {
    transform: scale(3) !important;
    padding: 500px !important;
    color: black;
  }
`;
