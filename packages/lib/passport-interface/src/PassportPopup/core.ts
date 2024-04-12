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
export function openZupassPopup(
  popupUrl: string,
  proofUrl: string
): Window | null {
  const url = `${popupUrl}?proofUrl=${encodeURIComponent(proofUrl)}`;
  return window.open(url, "_blank", "width=450,height=600,top=100,popup");
}

/**
 * The popup message can contain either an encoded PCD or encoded pending PCD.
 */
type PopupMessageResult =
  | {
      type: "pcd";
      pcdStr: string;
    }
  | {
      type: "pendingPcd";
      pendingPcdStr: string;
    }
  | {
      type: "aborted";
    };

/**
 * Asynchronous function that listens for PCDs and PendingPCDs from a Zupass
 * popup window using message passing and event listeners.
 */
export function receiveZupassPopupMessage(
  signal: AbortSignal
): Promise<PopupMessageResult> {
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
    window.addEventListener("message", receiveMessage, {
      // Remove this event listener automatically if abort signal fires.
      signal
    });
    signal.addEventListener("abort", () => {
      resolve({ type: "aborted" });
    });
  });
}

type PopupActionResult =
  | PopupMessageResult
  | { type: "popupClosed" }
  | { type: "popupBlocked" };

/**
 * An asynchronous function that opens a Zupass popup window, and returns a
 * {@link PopupActionResult} containing either:
 * - An encoded PCD
 * - An encoded pending PCD
 * - An indication that the popup was closed with no result
 * - An indication that the popup was blocked from opening
 *
 * By detecting popup blockers and the popup being closed without result, this
 * offers broader functionality than calling {@link openZupassPopup} and
 * {@link receiveZupassPopupMessage} separately. It is added as a new API to
 * avoid breaking backwards-compatibility for existing code.
 */
export async function zupassPopupAction(
  popupUrl: string,
  proofUrl: string
): Promise<PopupActionResult> {
  const popup = openZupassPopup(popupUrl, proofUrl);
  // If we did not get a window from `openZupassPopup`, it was blocked
  // See https://developer.mozilla.org/en-US/docs/Web/API/Window/open#return_value
  // This allows the caller to gracefully handle this, e.g. by notifying the
  // user
  if (!popup) {
    return { type: "popupBlocked" };
  }

  // If the popup is closed, the promise waiting for an event from the popup
  // will not know that this has happened, and so will remain unresolved
  // forever, leaking memory. To avoid this, we pass in an AbortController to
  // receiveZupassPopupMessage(), which allows it to resolve.
  // This is necessary even when using Promise.race(), as Promise.race() will
  // not clean up the unresolved promises even after they have definitely
  // "lost" the race.
  const abortReceiveMessage = new AbortController();

  // There's no way to receive an event indicating that a popup window has been
  // closed, and we can't rely on the code running inside the popup to send us
  // a message, so instead we have to check for it on a timer.
  // We are doing this in order to detect cases in which the popup window is
  // closed without any action being taken (e.g. a proof being generated).
  const closePromise = new Promise<{ type: "popupClosed" }>((resolve) => {
    const closeCheckInterval = window.setInterval(() => {
      if (popup.closed) {
        clearInterval(closeCheckInterval);
        // In the case where an action is completed, the popup will send a
        // message, and then close itself. In testing, it seems that the
        // message is always received before we pick up on the fact that the
        // popup is closed. However, for safety, we will avoid resolving this
        // promise for another 250ms, to ensure that the other promise
        // (containing the received message) definitely resolves first.
        window.setTimeout(() => {
          resolve({ type: "popupClosed" });
          // In the event that the message-receiving promise has *not*
          // resolved, we need to tell it to resolve now, to avoid a memory
          // leak.
          abortReceiveMessage.abort();
        }, 250);
      }
    }, 100);
  });

  // Race the closing of the window against the receipt of a message, and
  // return whichever resolves first.
  return Promise.race([
    closePromise,
    receiveZupassPopupMessage(abortReceiveMessage.signal)
  ]);
}
