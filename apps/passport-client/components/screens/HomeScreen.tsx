import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { Placeholder, Spacer } from "../core";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { AppHeader } from "../shared/AppHeader";
import { PCDCard } from "../shared/PCDCard";

/**
 * Show the user their passport, an overview of cards / PCDs.
 */
export function HomeScreen() {
  useSyncE2EEStorage();

  const [state] = useContext(DispatchContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (state.self == null) {
      console.log("Redirecting to login screen");
      navigate("/login");
    } else if (sessionStorage.pendingProofRequest != null) {
      console.log("Redirecting to prove screen");
      const encReq = encodeURIComponent(sessionStorage.pendingProofRequest);
      navigate("/prove?request=" + encReq);
      delete sessionStorage.pendingProofRequest;
    } else if (sessionStorage.pendingAddRequest != null) {
      console.log("Redirecting to add screen");
      const encReq = encodeURIComponent(sessionStorage.pendingAddRequest);
      navigate("/add?request=" + encReq);
      delete sessionStorage.pendingAddRequest;
    } else if (sessionStorage.pendingHaloRequest != null) {
      console.log("Redirecting to halo screen");
      navigate(`/halo${sessionStorage.pendingHaloRequest}`);
      delete sessionStorage.pendingHaloRequest;
    }
  });

  useEffect(() => {
    if (sessionStorage.newAddedPCDID != null) {
      // scroll to element with id of newAddedPCDID
      const el = document.getElementById(sessionStorage.newAddedPCDID);
      if (el) {
        el.scrollIntoView();
      }
      delete sessionStorage.newAddedPCDID;
    }
  });

  const pcds = useMemo(() => {
    return state.pcds.getAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pcds, state]);
  const mainIdPCD = useMemo(() => {
    return pcds[0]?.id;
  }, [pcds]);
  const [selectedPCDID, setSelectedPCDID] = useState("");
  const selectedPCD = useMemo(() => {
    let selected;

    // if user just added a PCD, highlight that one
    if (sessionStorage.newAddedPCDID != null) {
      selected = pcds.find((pcd) => pcd.id === sessionStorage.newAddedPCDID);
    } else {
      selected = pcds.find((pcd) => pcd.id === selectedPCDID);
    }

    // default to Zuzalu PCD if no valid PCD found
    if (selected === undefined) {
      selected = pcds[0];
    }

    return selected;
  }, [pcds, selectedPCDID]);

  if (state.self == null) return null;

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <Placeholder minH={540}>
          {pcds.map((pcd) => {
            return (
              <div id={pcd.id} key={pcd.id}>
                <Spacer h={8} />
                <PCDCard
                  pcd={pcd}
                  expanded={pcd.id === selectedPCD?.id}
                  isMainIdentity={pcd.id === mainIdPCD}
                  onClick={() => {
                    setSelectedPCDID(pcd.id);
                  }}
                />
              </div>
            );
          })}
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
