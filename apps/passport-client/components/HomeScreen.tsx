import * as React from "react";
import { Card } from "../src/model/Card";
import { CardElem } from "./CardElem";
import { Spacer } from "./core";

export function HomeScreen() {
  const cards = React.useMemo(getTestCards, []);
  const [sel, setSel] = React.useState(cards[0]);

  return (
    <>
      <Spacer h={24} />
      <CardElem
        card={sel}
        expanded
        onClick={() => window.alert("Under construction")}
      />
      <Spacer h={24} />
      {cards.map((c, i) => {
        if (c === sel) return <CardElem key={i} />; // empty slot
        return <CardElem key={i} card={c} onClick={() => setSel(c)} />;
      })}
    </>
  );
}

function getTestCards(): Card[] {
  const c1 = {
    id: "0x1234",
    type: "zuzalu-id",
    display: {
      icon: "🧑‍🦱",
      header: "Zuzalu Resident",
      title: "Vitalik Buterin",
      description: "Zuzalu resident #42",
      color: "#bcb",
    },
    secret: "",
  };

  const c2 = {
    id: "0x1111",
    type: "zk-email",
    display: {
      icon: "✉️",
      header: "@mit.edu email",
      title: "@mit.edu",
      description: "Zero-knowledge proof, holder has an @mit.edu email address",
      color: "#e8bbbb",
    },
    secret: "",
  };

  const c3 = {
    id: "0x2222",
    type: "ed25519-keypair",
    display: {
      icon: "🔑",
      header: "key #1",
      title: "Ed25519 key #1",
      description: "Sample hackathon API keypair",
      color: "#dca",
    },
    secret: "",
  };

  return [c1, c2, c3];
}
