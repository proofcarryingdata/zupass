import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { Placeholder, Spacer } from "../core";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { AppHeader } from "../shared/AppHeader";
import { PCDCard } from "../shared/PCDCard";

/**
 * Show the user their passport, an overview of cards / PCDs.
 */
export function HomeScreen() {
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
    }
  });

  const zuzaluPCDId = useMemo(() => {
    return state.pcds.getAll()[0].id;
  }, [state.pcds]);
  const [selectedPCDID, setSelectedPCDID] = useState(() => zuzaluPCDId);
  const selectedPCD = useMemo(() => {
    return state.pcds.getAll().find((pcd) => pcd.id === selectedPCDID);
  }, [state.pcds, selectedPCDID]);
  const allButSelectedPcd = useMemo(() => {
    return state.pcds.getAll().filter((pcd) => selectedPCDID !== pcd.id);
  }, [selectedPCDID, state.pcds]);

  if (state.self == null) return null;

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <Placeholder minH={540}>
          <PCDCard
            pcd={selectedPCD}
            expanded={true}
            isZuzaluIdentity={zuzaluPCDId === selectedPCD.id}
          />
          {allButSelectedPcd.map((pcd) => {
            return (
              <>
                <Spacer h={8} />
                <PCDCard
                  pcd={pcd}
                  expanded={false}
                  isZuzaluIdentity={pcd.id === selectedPCD.id}
                  onClick={() => {
                    console.log("CLICKED");
                    setSelectedPCDID(pcd.id);
                  }}
                />
              </>
            );
          })}
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
