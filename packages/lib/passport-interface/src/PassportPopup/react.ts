import { SerializedPCD } from "@pcd/pcd-types";
import { useEffect, useState } from "react";
import { receiveZupassPopupMessage, zupassPopupSetup } from "./core.js";

export type ReceivedZupassResponse = [
  string, // single PCD serialized to string
  string, // pending PCD (proven on server) serialized to string
  SerializedPCD[] // multiple PCDs proven at once, all serialized to strings in an array
];

/**
 * React hook that listens for PCDs and PendingPCDs from a Zupass popup window.
 * A thin wrapper around {@link receiveZupassPopupMessage}.
 */
export function useZupassPopupMessages(): ReceivedZupassResponse {
  const [pcdStr, setPCDStr] = useState("");
  const [multiPcdStrs, setMultiPcdStrs] = useState<SerializedPCD[]>([]);
  const [pendingPCDStr, setPendingPCDStr] = useState("");

  // Listen for PCDs coming back from the Zupass popup
  useEffect(() => {
    const abortReceiveMessage = new AbortController();
    receiveZupassPopupMessage(abortReceiveMessage.signal).then((result) => {
      if (result.type === "pcd") {
        setPCDStr(result.pcdStr);
      } else if (result.type === "pendingPcd") {
        setPendingPCDStr(result.pendingPcdStr);
      } else if (result.type === "multi-pcd") {
        setMultiPcdStrs(result.pcds);
      }
    });
    return () => {
      // If the hook is unmounted, signal that the message handlers can detach
      // by aborting.
      abortReceiveMessage.abort();
    };
  }, []);

  return [pcdStr, pendingPCDStr, multiPcdStrs];
}

/**
 * Call this hook on a dedicated /popup page in your app to integrate your
 * app with the Zupass proving/auth popup flow.
 *
 * See {@link zupassPopupSetup} for further details.
 */
export function useZupassPopupSetup(): string {
  // Usually this page redirects immediately. If not, show an error.
  const [error, setError] = useState("");

  useEffect(() => {
    zupassPopupSetup().then((maybeErrorMessage) => {
      if (maybeErrorMessage) {
        setError(maybeErrorMessage);
      }
    });
  }, []);

  return error;
}
