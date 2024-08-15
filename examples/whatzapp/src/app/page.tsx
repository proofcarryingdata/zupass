"use client";

import Component from "@/components/component";
import {
  EmbeddedZupassProvider,
  useEmbeddedZupass
} from "@/hooks/useEmbeddedZupass";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { useEffect, useMemo, useState } from "react";

const zapp = {
  name: "whatzapp",
  permissions: ["read", "write"]
};

function App() {
  const { z, connected } = useEmbeddedZupass();

  if (!connected) {
    return <div>Connecting...</div>;
  }

  return <ConnectedApp />;
}

function ConnectedApp() {
  const { z, connected } = useEmbeddedZupass();

  const [sent, setSent] = useState<PODPCD[]>([]);
  const [received, setReceived] = useState<PODPCD[]>([]);
  const [myId, setMyId] = useState<string>("");

  useEffect(() => {
    if (!connected) return;
    z.identity.getIdentityCommitment().then((id) => setMyId(id.toString()));
    z.feeds
      .isSubscribed(`${window.origin}/api/feed`, "1")
      .then((isSubscribed) => {
        if (!isSubscribed) {
          z.feeds.requestAddSubscription(`${window.origin}/api/feed`, "1");
        }
      });
    const timerId = setInterval(() => {
      z.fs.getAllInFolder("Whatzapp", true).then((result) => {
        const sent = result["Whatzapp/Outbox"] ?? [];
        const received = result["Whatzapp/Inbox"] ?? [];
        const sentPCDs = Promise.all(
          sent.map((pcd) => PODPCDPackage.deserialize(pcd.pcd))
        );
        const receivedPCDs = Promise.all(
          received.map((pcd) => PODPCDPackage.deserialize(pcd.pcd))
        );
        // PODPCD has a class member that makes it not a PCD<claim, proof>, so we need to cast it
        sentPCDs.then((pcds) => {
          setSent(pcds as PODPCD[]);
        });
        receivedPCDs.then((pcds) => {
          setReceived(pcds as PODPCD[]);
        });
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [connected, z]);

  const conversations = useMemo(() => {
    const conversations = new Map<string, PODPCD[]>();

    for (const message of sent) {
      const recipient = message.claim.entries["recipient"].value.toString();
      if (!conversations.has(recipient)) {
        conversations.set(recipient, [message]);
      } else {
        conversations.get(recipient)?.push(message);
      }
    }

    for (const message of received) {
      const sender = message.claim.entries["sender"].value.toString();
      if (!conversations.has(sender)) {
        conversations.set(sender, [message]);
      } else {
        conversations.get(sender)?.push(message);
      }
    }

    Array.from(conversations).forEach(([key, value]) => {
      conversations.set(
        key,
        value.sort((a, b) => {
          const diff =
            (a.claim.entries["timestamp"].value as bigint) -
            (b.claim.entries["timestamp"].value as bigint);
          return diff < 0n ? -1 : diff > 0n ? 1 : 0;
        })
      );
    });

    return conversations;
  }, [received, sent]);

  console.log({ conversations });

  if (!connected || !myId) {
    return null;
  }

  return <Component conversations={conversations} myId={myId} />;
}

export default function Home() {
  const zupassUrl =
    process.env.NEXT_PUBLIC_ZUPASS_URL ?? "http://localhost:3000";

  return (
    <EmbeddedZupassProvider zapp={zapp} zupassUrl={zupassUrl}>
      <App />
    </EmbeddedZupassProvider>
  );
}
