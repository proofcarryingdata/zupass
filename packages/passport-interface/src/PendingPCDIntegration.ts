import { useEffect, useState } from "react";
import { PendingPCD, PendingPCDStatus } from "./PendingPCDUtils";
import { StatusRequest, StatusResponse } from "./RequestTypes";

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

    const getStatus = () => {
      if (pendingPCDStr !== undefined && pendingPCDStr !== "") {
        const pendingPCD: PendingPCD = JSON.parse(pendingPCDStr);

        const request: StatusRequest = {
          hash: pendingPCD.hash
        };

        fetch(`${passportURL}pcds/status`, {
          method: "POST",
          body: JSON.stringify(request),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        })
          .then((response) => response.json())
          .then((data: StatusResponse) => {
            setPendingPCDStatus(data.status);
            if (
              data.status === PendingPCDStatus.COMPLETE &&
              data.serializedPCD !== undefined
            ) {
              setPCDStr(data.serializedPCD);
              setPendingPCDError("");
              clearInterval(interval);
            } else if (
              data.status === PendingPCDStatus.ERROR &&
              data.error !== undefined
            ) {
              setPendingPCDError(data.error);
              clearInterval(interval);
            }
          })
          .catch((error) => {
            setPendingPCDStatus(PendingPCDStatus.ERROR);
            setPendingPCDError(error);
            clearInterval(interval);
          });
      }
    };

    interval = setInterval(getStatus, 1000);

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
