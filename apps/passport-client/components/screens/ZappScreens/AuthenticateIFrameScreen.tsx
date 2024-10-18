import { ReactNode, useEffect, useMemo } from "react";
import { useLoginIfNoSelf, useSyncKey } from "../../../src/appHooks";
import { pendingRequestKeys } from "../../../src/sessionStorage";
import { Spacer } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { AppContainer } from "../../shared/AppContainer";
import { IFrameAuthenticationMessage } from "./ConnectPopupScreen";

export function AuthenticateIFrameScreen(): ReactNode {
  const encryptionKey = useSyncKey();

  useLoginIfNoSelf(pendingRequestKeys.authenticateIFrame, "true");

  // We should only process Zapp approval requests if this window was opened
  // by a Zupass iframe.
  const isLegitimateOpener = useMemo(() => {
    return (
      !!window.opener &&
      new URL(window.opener.location.href).origin === window.location.origin
    );
  }, []);

  useEffect(() => {
    if (isLegitimateOpener && encryptionKey) {
      const chan = new MessageChannel();
      chan.port1.onmessage = (): void => {
        // We're going to send the encryption key to the iframe
        // When the iframe gets the encryption key, it will
        // send a message back to this port, and we can close
        // this window
        window.close();
      };
      // Zapp is already approved, return to the Zupass iframe
      window.opener.postMessage(
        {
          type: "auth",
          encryptionKey: encryptionKey as string
        } satisfies IFrameAuthenticationMessage,
        window.location.origin,
        [chan.port2]
      );
      window.close();
    }
  }, [isLegitimateOpener, encryptionKey]);

  return (
    <AppContainer bg="gray">
      <Spacer h={64} />
      <RippleLoader />
    </AppContainer>
  );
}
