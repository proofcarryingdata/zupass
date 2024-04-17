import { useEffect, useState } from "react";
import { receiveZupassPopupMessage, zupassPopupSetup } from "./core";

/**
 * React hook that listens for PCDs and PendingPCDs from a Zupass popup window.
 * A thin wrapper around {@link receiveZupassPopupMessage}.
 */
export function useZupassPopupMessages(): [string, string] {
  const [pcdStr, setPCDStr] = useState("");
  const [pendingPCDStr, setPendingPCDStr] = useState("");

  // Listen for PCDs coming back from the Zupass popup
  useEffect(() => {
    const abortReceiveMessage = new AbortController();
    receiveZupassPopupMessage(abortReceiveMessage.signal).then((result) => {
      if (result.type === "pcd") {
        setPCDStr(result.pcdStr);
      } else if (result.type === "pendingPcd") {
        setPendingPCDStr(result.pendingPcdStr);
      }
    });
    return () => {
      // If the hook is unmounted, signal that the message handlers can detach
      // by aborting.
      abortReceiveMessage.abort();
    };
  }, []);

  return [pcdStr, pendingPCDStr];
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
