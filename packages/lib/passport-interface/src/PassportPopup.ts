import { useEffect, useState } from "react";

/**
 * React hook that listens for PCDs and PendingPCDs from a Zupass popup window
 * using message passing and event listeners.
 */
export function useZupassPopupMessages(): [string, string] {
  const [pcdStr, setPCDStr] = useState("");
  const [pendingPCDStr, setPendingPCDStr] = useState("");

  // Listen for PCDs coming back from the Zupass popup
  useEffect(() => {
    function receiveMessage(ev: MessageEvent<any>): void {
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
    return (): void => window.removeEventListener("message", receiveMessage);
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
    if (window.opener == null) {
      setError("Not a popup window");
      return;
    }

    let params;

    // Hash routing is commonly used in web applications to enable client-side
    // routing without requiring server-side configuration, typically single-page applications.
    // Without hash routing, the server should always serve the same index.html file for any route.
    // Some providers, like Github Pages, don't provide this feature.
    // To read the parameters of a URL with hash routing, the hash must first be removed.
    if (window.location.href.includes(window.location.origin + "/#/")) {
      const url = new URL(window.location.href.replace("#", ""));

      params = url.searchParams;
    } else {
      params = new URLSearchParams(window.location.search);
    }

    const paramsProofUrl = params.get("proofUrl");
    const paramsProof = params.get("proof");
    const paramsEncodingPendingPCD = params.get("encodedPendingPCD");
    const finished = params.get("finished");

    // First, this page is window.open()-ed. Redirect to Zupass.
    if (paramsProofUrl != null) {
      window.location.href = paramsProofUrl;
    } else if (finished) {
      // Later, Zupass redirects back with a result. Send it to our parent.
      if (paramsProof != null) {
        window.opener.postMessage({ encodedPCD: paramsProof }, "*");
      }

      window.close();
      setTimeout(() => {
        setError("Finished. Please close this window.");
      }, 1000 * 3);
    } else if (paramsEncodingPendingPCD != null) {
      // Later, Zupass redirects back with a encodedPendingPCD. Send it to our parent.
      window.opener.postMessage(
        { encodedPendingPCD: paramsEncodingPendingPCD },
        "*"
      );
      window.close();
      setTimeout(() => {
        setError("Finished. Please close this window.");
      }, 1000 * 3);
    }
  }, []);

  return error;
}

/**
 * Open up a Zupass popup window using proofUrl from specific PCD integrations
 * and popupUrl, which is the route where the useZupassPopupSetup hook is being
 * served from.
 */
export function openZupassPopup(popupUrl: string, proofUrl: string): void {
  const url = `${popupUrl}?proofUrl=${encodeURIComponent(proofUrl)}`;
  window.open(url, "_blank", "width=450,height=600,top=100,popup");
}
