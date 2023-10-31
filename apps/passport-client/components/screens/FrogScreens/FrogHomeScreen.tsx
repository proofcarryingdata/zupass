import { Separator } from "@pcd/passport-ui";
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import {
  useDispatch,
  useIsSyncSettled,
  usePCDsInFolder,
  useSubscriptions
} from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { PCDCard } from "../../shared/PCDCard";
import { SyncingPCDs } from "../../shared/SyncingPCDs";

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
  const frogPCDs = usePCDsInFolder("FrogCrypto");

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
      <MaybeModal />
      <AppContainer bg="gray">
        <Container>
          <AppHeader />

          <button disabled={!frogSub} onClick={getFrog}>
            Get Frog
          </button>

          {frogPCDs.length > 0 && (
            <>
              <Separator />
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

  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PCDContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
