import * as React from "react";
import { useContext, useEffect, useState } from "react";
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

  const [selectedPCD, setSelectedPCD] = useState(0);

  if (state.self == null) return null;

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <Placeholder minH={540}>
          {state.pcds.getAll().map((pcd, i) => {
            return (
              // 1st card is the zuzalu identity pcd
              <PCDCard pcd={pcd} expanded isZuzaluIdentity={i === 0} />
            );
          })}
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
