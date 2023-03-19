import { ZuParticipant } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { Card, CardZID } from "../../src/model/Card";
import { Spacer } from "../core";
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
    }
  });

  const cards = useMemo(
    () => getTestCards(state.identity, state.self),
    [state]
  );
  const [sel, setSel] = useState(0);

  if (state.self == null) return null;

  return (
    <>
      <Spacer h={24} />
      <AppHeader />
      <Spacer h={24} />
      <CardElem card={cards[sel]} expanded />
      <Spacer h={24} />
      {cards.map((c, i) => {
        if (i === sel) return null;
        return <CardElem key={i} card={c} onClick={() => setSel(i)} />;
      })}
    </>
  );
}

function getTestCards(identity: Identity, self?: ZuParticipant): Card[] {
  const c1: CardZID | undefined = self && {
    id: "0x1234",
    type: "zuzalu-id",
    header: "VERIFIED ZUZALU PASSPORT",
    identity,
    participant: self,
  };

  const c2 = {
    id: "0x1111",
    type: "zk-email",
    header: "@MIT.EDU EMAIL",
  };

  const c3 = {
    id: "0x2222",
    type: "ed25519-keypair",
    header: "Ed25519 KEY #1",
  };

  return [c1, c2, c3].filter((c) => c != null);
}
