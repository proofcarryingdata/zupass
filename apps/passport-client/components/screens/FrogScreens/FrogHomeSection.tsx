import { isEdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import {
  CredentialManager,
  FrogCryptoFolderName,
  FrogCryptoUserStateResponseValue,
  IFrogCryptoFeedSchema,
  Subscription,
  requestFrogCryptoGetUserState
} from "@pcd/passport-interface";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useCredentialCache,
  useDispatch,
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
import { ScoreTab } from "./ScoreTab";
import { TypistText } from "./TypistText";

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

const scoreToFrogTitle: (number) => string = (score: number) => {
  if (score > 133) {
    return `🟢 LEGEND`;
  } else if (score > 68) {
    return `🔵 GRANDMASTER - ${Math.floor(((score - 69) / 64) * 100)}%`;
  } else if (score > 35) {
    return `🟣 MASTER - ${Math.floor(((score - 36) / 32) * 100)}%`;
  } else if (score > 18) {
    return `🔴 EXPERT - ${Math.floor(((score - 19) / 16) * 100)}%`;
  } else if (score > 9) {
    return `🟠 JORUNEYMAN - ${Math.floor(((score - 10) / 8) * 100)}%`;
  } else if (score > 4) {
    return `🟡 APPRENTICE - ${Math.floor(((score - 5) / 5) * 100)}%`;
  } else {
    return `⚪️ NOVICE(${Math.floor(((score - 0) / 5) * 100)}%)`;
  }
};

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
          Score {myScore} <br /> {scoreToFrogTitle(myScore)}
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
              <DexTab
                possibleFrogIds={userState.possibleFrogIds}
                pcds={frogPCDs}
              />
            )}
          </>
        ))}
    </Container>
  );
}

/**
 * Fetch the user's frog crypto state as well as the ability to refetch.
 */
function useUserFeedState(subscriptions: Subscription[]) {
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
    const pcd = await credentialManager.requestCredential({
      signatureType: "sempahore-signature-pcd"
    });

    const state = await requestFrogCryptoGetUserState(appConfig.zupassServer, {
      pcd,
      feedIds: JSON.parse(feedIdsString)
    });

    setUserState(state.value);
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

export const DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL = `${appConfig.frogCryptoServer}/frogcrypto/feeds`;

/**
 * Returns a callback to register the default frog subscription provider and
 * subscribes to all public frog feeds.
 */
const useInitializeFrogSubscriptions: () => () => Promise<void> = () => {
  const dispatch = useDispatch();
  const { value: subs } = useSubscriptions();

  return useCallback(async () => {
    subs.getOrAddProvider(
      DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL,
      FrogCryptoFolderName
    );

    // Subscribe to public feeds. We don't check for duplicates here because
    // this function should only be called if user has no frog subscriptions.
    await subs.listFeeds(DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL).then((res) => {
      if (res.feeds.length === 0) {
        toast.error(
          "Hop, hop, hooray! But wait – the adventure isn't ready to ignite just yet. The fireflies haven't finished their dance. Come back shortly, and we'll leap into the fun together!"
        );
        return;
      }

      res.feeds.forEach((feed) => {
        const parsed = IFrogCryptoFeedSchema.safeParse(feed);
        if (parsed.success) {
          dispatch({
            type: "add-subscription",
            providerUrl: DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL,
            providerName: FrogCryptoFolderName,
            feed
          });

          if (parsed.data.activeUntil > Date.now() / 1000) {
            toast.success(
              `Croak and awe! The ${feed.name} awaits your adventurous leap!`,
              {
                icon: "🏕️"
              }
            );
          }
        } else {
          console.error(
            "Failed to parse feed as FrogFeed",
            feed,
            parsed["error"]
          );
        }
      });
    });
  }, [dispatch, subs]);
};

const Container = styled.div`
  padding: 16px;
  width: 100%;
  height: 100%;
  max-width: 100%;
  font-family: monospace;

  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const Score = styled.div`
  font-size: 16px;
  text-align: center;
`;
