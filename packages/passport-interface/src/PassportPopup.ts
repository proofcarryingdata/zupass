import { useEffect, useState } from "react";

/**
 * React hook that listens for PCDs and PendingPCDs from a passport popup window
 * using message passing and event listeners.
 */
export function usePassportPopupMessages() {
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
