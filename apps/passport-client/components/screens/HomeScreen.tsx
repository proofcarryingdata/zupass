import { ZuParticipant } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { Card, ZuIdCard } from "../../src/model/Card";
import { Placeholder, Spacer } from "../core";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { AppHeader } from "../shared/AppHeader";
import { CardElem } from "../shared/CardElem";

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

  const cards = useMemo(
    () => getTestCards(state.identity, state.self),
    [state]
  );
  const [sel, _setSel] = useState(0);

  if (state.self == null) return null;

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <Placeholder minH={540}>
          <CardElem card={cards[sel]} expanded />
        </Placeholder>
        <Spacer h={24} />
        {/*cards.map((c, i) => {
        if (i === sel) return <Spacer key={i} h={48} />;
        return <CardElem key={i} card={c} onClick={() => setSel(i)} />;
      })*/}
      </AppContainer>
    </>
  );
}

function getTestCards(identity: Identity, self?: ZuParticipant): Card[] {
  const c1: ZuIdCard | undefined = self && {
    id: "0x1234",
    type: "zuzalu-id",
    header: "VERIFIED ZUZALU PASSPORT",
    identity,
    participant: self,
  };
  return [c1];
}
