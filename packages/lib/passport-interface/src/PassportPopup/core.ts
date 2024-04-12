/*
 * A function that should be called from within a popup window opened by
 * {@link openZupassPopup}.
 *
 * The caller should set up a page/route on your site at /popup, which then
 * calls this function. The URL to that page is the `popupUrl` passed to
 * {@link openZupassPopup}. When the popup window is opened, it will first to a
 * page on Zupass, which will perform some computation and return the result
 * to the calling site via URL parameters to the popup page.
 *
 * The function parses the result from those URL parameters, then uses the
 * `postMessage` browser API to inform the original window of the result.
 *
 * A popup page must be hosted on the website that integrates with Zupass, as data can't
 * be passed between a website and a popup on a different origin like zupass.org.
 * This hook sends messages with a full client-side PCD or a server-side PendingPCD
 * that can be processed by the `useZupassPopupMessages` hook. PendingPCD requests
 * can further be processed by `usePendingPCD` and `usePCDMultiplexer`.
 */
export async function zupassPopupSetup(): Promise<string | undefined> {
  if (!window.opener) {
    return "zupassPopupSetup() can only be called from within a popup window";
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
  if (paramsProofUrl) {
    window.location.href = paramsProofUrl;
  } else if (finished) {
    // Later, Zupass redirects back with a result. Send it to our parent.
    if (paramsProof) {
      window.opener.postMessage({ encodedPCD: paramsProof }, "*");
    }

    window.close();
    // Almost certainly the window will close. But if, for some reason, it
    // does not then we should return a string that will be shown as an error
    // message. Wait a few seconds, so the error message doesn't "flash" up as
    // the screen is closing.
    await new Promise<void>((resolve) =>
      window.setTimeout(() => resolve(), 1000 * 3)
    );
    return "Finished. Please close this window.";
  } else if (paramsEncodingPendingPCD) {
    // Later, Zupass redirects back with a encodedPendingPCD. Send it to our parent.
    window.opener.postMessage(
      { encodedPendingPCD: paramsEncodingPendingPCD },
      "*"
    );
    window.close();
    await new Promise<void>((resolve) =>
      window.setTimeout(() => resolve(), 1000 * 3)
    );
    return "Finished. Please close this window.";
  }
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

/**
 * The popup message can contain either an encoded PCD or encoded pending PCD.
 */
type PopupResultMessage =
  | {
      type: "pcd";
      pcdStr: string;
    }
  | {
      type: "pendingPcd";
      pendingPcdStr: string;
    };

/**
 * Asynchronous function that listens for PCDs and PendingPCDs from a Zupass
 * popup window using message passing and event listeners.
 */
export function receiveZupassPopupMessage(): Promise<PopupResultMessage> {
  return new Promise((resolve) => {
    const receiveMessage = (ev: MessageEvent): void => {
      if (ev.data.encodedPCD) {
        resolve({ type: "pcd", pcdStr: ev.data.encodedPCD });
        window.removeEventListener("message", receiveMessage);
      } else if (ev.data.encodedPendingPCD) {
        resolve({
          type: "pendingPcd",
          pendingPcdStr: ev.data.encodedPendingPCD
        });
        window.removeEventListener("message", receiveMessage);
      }
    };
    window.addEventListener("message", receiveMessage, false);
  });
}
