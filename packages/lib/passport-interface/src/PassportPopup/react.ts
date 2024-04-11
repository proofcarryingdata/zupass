import { useEffect, useState } from "react";
import { receiveZupassPopupMessage, zupassPopupSetup } from "./core";

/**
 * React hook that listens for PCDs and PendingPCDs from a Zupass popup window
 * using message passing and event listeners.
 */
export function useZupassPopupMessages(): [string, string] {
  const [pcdStr, setPCDStr] = useState("");
  const [pendingPCDStr, setPendingPCDStr] = useState("");

  // Listen for PCDs coming back from the Zupass popup
  useEffect(() => {
    receiveZupassPopupMessage().then((result) => {
      if (result.type === "pcd") {
        setPCDStr(result.pcdStr);
      } else {
        setPendingPCDStr(result.pendingPcdStr);
      }
    });
  }, []);

  return [pcdStr, pendingPCDStr];
}

/**
 * A react hook that sets up necessary Zupass popup logic on a specific route.
 * A popup page must be hosted on the website that integrates with Zupass, as data can't
 * be passed between a website and a popup on a different origin like zupass.org.
 * This hook sends messages with a full client-side PCD or a server-side PendingPCD
 * that can be processed by the `useZupassPopupMessages` hook. PendingPCD requests
 * can further be processed by `usePendingPCD` and `usePCDMultiplexer`.
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
