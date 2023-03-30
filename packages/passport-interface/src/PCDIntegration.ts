import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";
import { PendingStampPCD } from "./StampUtils";

export function useProof<T extends PCDPackage>(
  proofPackage: T,
  proofEnc: string
) {
  const [proof, setProof] = useState<PCDOf<T>>();

  useEffect(() => {
    if (proofEnc) {
      const parsedPCD = JSON.parse(proofEnc);
      if (parsedPCD.type !== proofPackage.name) {
        return;
      }
      proofPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setProof(pcd as any);
      });
    }
  }, [proofPackage, proofEnc, setProof]);

  return proof;
}

/**
 * React hook that listens for PCDs and/or PendingStampPCDs returned by the passport
 * to the application. The former is returned if client-side proofs are selected, the
 * latter if server-side proofs are selected.
 */
export function usePassportPCD(): [string, PendingStampPCD | undefined] {
  const [pcdStr, setPcdStr] = useState("");
  const [pendingStampPCD, setPendingStampPCD] = useState<
    PendingStampPCD | undefined
  >();

  // Listen for PCDs coming back from the Passport popup
  useEffect(() => {
    function receiveMessage(ev: MessageEvent<any>) {
      // Need to only listen for our intended messages; extensions including MetaMask
      // apparently send messages to every page.
      if (ev.data.encodedPCD) {
        console.log("Received PCD", ev.data.encodedPCD);
        setPcdStr(ev.data.encodedPCD);
      } else if (ev.data.pendingStampPCD) {
        console.log("Received PendingStampPCD", ev.data.pendingStampPCD);
        setPendingStampPCD(ev.data.pendingStampPCD);
      }
    }
    window.addEventListener("message", receiveMessage, false);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return [pcdStr, pendingStampPCD];
}
