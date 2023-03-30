import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";
import { PendingStamp } from "./StampUtils";

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
 * React hook that listens for PCDs and/or PendingStamps returned by the passport
 * to the application. The former is returned if client-side proofs are selected, the
 * latter if server-side proofs are selected.
 */
export function usePassportPCD(): [string, PendingStamp | undefined] {
  const [pcdStr, setPcdStr] = useState("");
  const [pendingStamp, setPendingStamp] = useState<PendingStamp | undefined>();

  // Listen for PCDs coming back from the Passport popup
  useEffect(() => {
    function receiveMessage(ev: MessageEvent<any>) {
      // Need to only listen for our intended messages; extensions including MetaMask
      // apparently send messages to every page.
      if (ev.data.encodedPcd) {
        console.log("Received PCD", ev.data.encodedPcd);
        setPcdStr(ev.data.encodedPcd);
      } else if (ev.data.pendingStamp) {
        console.log("Received pending stamp", ev.data.pendingStamp);
        setPendingStamp(ev.data.pendingStamp);
      }
    }
    window.addEventListener("message", receiveMessage, false);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return [pcdStr, pendingStamp];
}
