import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";

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
 * React hook that listens for PCDs returned by the passport to the application.
 */
export function usePassportResponse() {
  const [pcdStr, setPCDStr] = useState("");
  const [pendingPCDStr, setPendingPCDStr] = useState("");

  // Listen for PCDs coming back from the Passport popup
  useEffect(() => {
    function receiveMessage(ev: MessageEvent<any>) {
      // Extensions including Metamask apparently send messages to every page. Ignore those.
      if (ev.data.encodedPCD) {
        console.log("Received PCD", ev.data.encodedPCD);
        setPCDStr(ev.data.encodedPCD);
      } else if (ev.data.encodedPendingPCD) {
        console.log(ev.data);
        setPendingPCDStr(ev.data.encodedPendingPCD);
      }
    }
    window.addEventListener("message", receiveMessage, false);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return [pcdStr, pendingPCDStr];
}
