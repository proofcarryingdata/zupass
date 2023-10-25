import { Separator } from "@pcd/passport-ui";
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import {
  useDispatch,
  useIsSyncSettled,
  usePCDCollection,
  useSubscriptions
} from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { WrappedPCDCard } from "../HomeScreen";

/** A placeholder screen for FrogCrypto.
 *
 * We might want to consider slotting this into the existing HomeScreen to better integrate with PCD explorer.
 */
export function FrogHomeScreen() {
  useSyncE2EEStorage();
  const dispatch = useDispatch();
  const syncSettled = useIsSyncSettled();
  const { value: subs } = useSubscriptions();
  const frogSub = useMemo(
    () => subs.getActiveSubscriptions().find((sub) => sub.feed.name === "Bog"),
    [subs]
  );
  const pcds = usePCDCollection();
  // NB: we cannot use useMemo because pcds are mutate in-place
  const frogPCDs = pcds.getAllPCDsInFolder("FrogCrypto");

  const getFrog = useCallback(async () => {
    if (!frogSub) {
      return;
    }

    dispatch({
      type: "sync-subscription",
      subscriptionId: frogSub.id
    });
  }, [dispatch, frogSub]);

  const [selectedPCDID, setSelectedPCDID] = useState("");
  const selectedPCD = useMemo(() => {
    // if user just added a PCD, highlight that one
    if (sessionStorage.newAddedPCDID) {
      const added = frogPCDs.find(
        (pcd) => pcd.id === sessionStorage.newAddedPCDID
      );
      if (added) {
        return added;
      }
    }

    const selected = frogPCDs.find((pcd) => pcd.id === selectedPCDID);
    if (selected) {
      return selected;
    }

    // default to first PCD if no selected PCD found
    return frogPCDs[0];
  }, [frogPCDs, selectedPCDID]);
  const onPcdClick = useCallback((id: string) => {
    setSelectedPCDID(id);
  }, []);

  if (!syncSettled) {
    return <SyncingPCDs />;
  }

  return (
    <>
      <MaybeModal fullScreen />
      <AppContainer bg="gray">
        <Container>
          <Spacer h={16} />
          <AppHeader />
          <Spacer h={16} />

          <button disabled={!frogSub} onClick={getFrog}>
            Get Frog
          </button>

          {frogPCDs.length > 0 && (
            <>
              <Separator />
              {frogPCDs.map((pcd) => (
                <WrappedPCDCard
                  key={pcd.id}
                  pcd={pcd}
                  mainIdPCD=""
                  onPcdClick={onPcdClick}
                  expanded={pcd.id === selectedPCD?.id}
                />
              ))}
            </>
          )}
        </Container>
      </AppContainer>
    </>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  height: 100%;
  max-width: 100%;
`;
