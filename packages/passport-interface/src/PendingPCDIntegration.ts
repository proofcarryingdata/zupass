import { useEffect, useState } from "react";
import { requestServerProofStatus } from "./api/requestServerProofStatus";
import { PendingPCD, PendingPCDStatus } from "./PendingPCDUtils";

/**
 * React hook that pings server on status of a PendingPCD. Returns a serialized
 * PCD when a completed PCD is returned, or the current status.
 */
export function usePendingPCD(
  pendingPCDStr: string,
  passportURL: string
): [PendingPCDStatus, string, string] {
  const [pendingPCDStatus, setPendingPCDStatus] = useState<PendingPCDStatus>(
    PendingPCDStatus.NONE
  );
  const [pendingPCDError, setPendingPCDError] = useState("");
  const [pcdStr, setPCDStr] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;

    const getProofStatus = async () => {
      if (pendingPCDStr !== undefined && pendingPCDStr !== "") {
        const pendingPCD: PendingPCD = JSON.parse(pendingPCDStr);

        const proofStatusResult = await requestServerProofStatus(passportURL, {
          hash: pendingPCD.hash
        });

        if (!proofStatusResult.success) {
          setPendingPCDStatus(PendingPCDStatus.ERROR);
          setPendingPCDError(proofStatusResult.error);
          clearInterval(interval);
          return;
        }

        setPendingPCDStatus(proofStatusResult.value.status);

        if (
          proofStatusResult.value.status === PendingPCDStatus.COMPLETE &&
          proofStatusResult.value.serializedPCD !== undefined
        ) {
          setPCDStr(proofStatusResult.value.serializedPCD);
          setPendingPCDError("");
          clearInterval(interval);
        } else if (
          proofStatusResult.value.status === PendingPCDStatus.ERROR &&
          proofStatusResult.value.error !== undefined
        ) {
          setPendingPCDError(proofStatusResult.value.error);
          clearInterval(interval);
        }
      }
    };

    interval = setInterval(getProofStatus, 1000);

    return () => clearInterval(interval);
  }, [pendingPCDStr, passportURL]);

  return [pendingPCDStatus, pendingPCDError, pcdStr];
}

/**
 * Multiplexer hook to choose between client-side and server-side PCDs.
 */
export function usePCDMultiplexer(
  passportPCDStr: string,
  serverPCDStr: string
): string {
  const [pcdStr, setPCDStr] = useState("");

  useEffect(() => {
    console.log(passportPCDStr);
    if (passportPCDStr) {
      setPCDStr(passportPCDStr);
    } else if (serverPCDStr) {
      setPCDStr(serverPCDStr);
    }
  }, [passportPCDStr, serverPCDStr]);

  return pcdStr;
}
