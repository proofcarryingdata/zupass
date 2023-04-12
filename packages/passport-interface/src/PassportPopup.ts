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

/**
 * React hook to be used on whatever route the passport popup is redirected from.
 * Sends messages back to original page to be processed by `usePassportPopupMessages`.
 */
export function usePassportPopupRedirect() {
  // In the happy case, this page redirects immediately.
  // If not, show an error.
  const [err, setErr] = useState("");

  useEffect(() => {
    if (window.opener == null) {
      setErr("Not a popup window");
      return;
    }

    const search = window.location.search;
    const params = new URLSearchParams(search);

    const paramsProofUrl = params.get("proofUrl");
    const paramsProof = params.get("proof");
    const paramsEncodingPendingPCD = params.get("encodedPendingPCD");

    // First, this page is window.open()-ed. Redirect to the Passport app.
    if (paramsProofUrl != null) {
      window.location.href = decodeURIComponent(paramsProofUrl);
    } else if (paramsProof != null) {
      // Later, the Passport redirects back with a proof. Send it to our parent.
      window.opener.postMessage({ encodedPCD: paramsProof }, "*");
      window.close();
    } else if (paramsEncodingPendingPCD != null) {
      // Later, the Passport redirects back with a encodedPendingPCD. Send it to our parent.
      window.opener.postMessage(
        { encodedPendingPCD: paramsEncodingPendingPCD },
        "*"
      );
      window.close();
    }
  }, []);

  return err;
}

/**
 * Open up a passport popup window using proofUrl from specific PCD integrations
 * and popupUrl, which is the route where the usePassportPopupRedirect hook is being
 * served from.
 */
export function openPassportPopup(popupUrl: string, proofUrl: string) {
  const url = `${popupUrl}?proofUrl=${encodeURIComponent(proofUrl)}`;
  window.open(url, "_blank", "width=360,height=480,top=100,popup");
}
