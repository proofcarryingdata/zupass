import { EdDSAFrogPCD, EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
import {
  CredentialManager,
  FrogCryptoUserStateResponseValue,
  requestFrogCryptoGetUserState
} from "@pcd/passport-interface";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useCredentialCache,
  useDispatch,
  useIdentity,
  useIsSyncSettled,
  usePCDsInFolder,
  useSubscriptions
} from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { ActionButton, Button } from "./Button";
import { DexTab } from "./DEXTab";
import { GetFrogTab } from "./GetFrogTab";
import { ScoreTab } from "./ScoreTab";

/** A placeholder screen for FrogCrypto.
 *
 * We might want to consider slotting this into the existing HomeScreen to better integrate with PCD explorer.
 */
export function FrogHomeScreen() {
  useSyncE2EEStorage();
  const syncSettled = useIsSyncSettled();
  const frogPCDs = usePCDsInFolder("FrogCrypto");
  const { subs, frogs, refetch } = useFrogSubscriptions();
  const [tab, setTab] = useState<"get" | "score" | "dex">("get");

  const initFrog = useInitializeFrogSubscriptions();

  if (!syncSettled) {
    return <SyncingPCDs />;
  }

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Container>
          <AppHeader />

          <img
            draggable="false"
            src="/images/frogs/frogcrypto.svg"
            width="100%"
            style={{ transform: "translate(-2.5px, 1px)" }}
          />

          {subs.length === 0 && (
            <ActionButton onClick={initFrog}>light fire</ActionButton>
          )}
          {subs.length > 0 &&
            (frogPCDs.length === 0 ? (
              <GetFrogTab subs={subs} refetch={refetch} />
            ) : (
              <>
                <ButtonGroup>
                  <Button
                    disabled={tab === "get"}
                    onClick={() => setTab("get")}
                  >
                    get frogs
                  </Button>
                  <Button
                    disabled={tab === "score"}
                    onClick={() => setTab("score")}
                  >
                    hi scores
                  </Button>
                  <Button
                    disabled={tab === "dex"}
                    onClick={() => setTab("dex")}
                  >
                    frogedex
                  </Button>
                </ButtonGroup>

                {tab === "get" && <GetFrogTab subs={subs} refetch={refetch} />}
                {tab === "score" && <ScoreTab />}
                {tab === "dex" && <DexTab frogs={frogs} pcds={frogPCDs} />}
              </>
            ))}
        </Container>
      </AppContainer>
    </>
  );
}

const DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL = `${appConfig.zupassServer}/frogcrypto/feeds`;

function useFrogSubscriptions() {
  const subs = useSubscriptions();
  const frogSubscriptions = useMemo(
    () =>
      subs.value
        .getActiveSubscriptions()
        .filter((sub) => sub.providerUrl.includes("frogcrypto")),
    [subs]
  );

  const [userState, setUserState] =
    useState<FrogCryptoUserStateResponseValue>();
  const identity = useIdentity();
  const pcds = usePCDCollection();
  const credentialCache = useCredentialCache();
  const credentialManager = useMemo(
    () => new CredentialManager(identity, pcds, credentialCache),
    [credentialCache, identity, pcds]
  );
  const refreshUserState = useCallback(async () => {
    const pcd = await credentialManager.requestCredential({
      signatureType: "sempahore-signature-pcd"
    });

    const state = await requestFrogCryptoGetUserState(appConfig.zupassServer, {
      pcd
    });

    setUserState(state.value);
  }, [credentialManager]);
  useEffect(() => {
    refreshUserState();
  }, [refreshUserState]);

  return useMemo(
    () => ({
      subs: frogSubscriptions.map((sub) => ({
        ...sub,
        nextFetchAt: userState?.feeds?.find(
          (feed) => feed.feedId === sub.feed.id
        )?.nextFetchAt
      })),
      frogs: userState?.frogs,
      refetch: refreshUserState
    }),
    [frogSubscriptions, userState, refreshUserState]
  );
}

const useInitializeFrogSubscriptions = () => {
  const dispatch = useDispatch();
  const { value: subs } = useSubscriptions();

  return useCallback(async () => {
    subs.getOrAddProvider(DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL, "FrogCrypto");

    // Subscribe to public feeds
    await subs.listFeeds(DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL).then((res) =>
      res.feeds.forEach((feed) =>
        dispatch({
          type: "add-subscription",
          providerUrl: DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL,
          providerName: "FrogCrypto",
          feed
        })
      )
    );
  }, [dispatch, subs]);
};

const Container = styled.div`
  padding: 16px;
  width: 100%;
  height: 100%;
  max-width: 100%;

  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;
