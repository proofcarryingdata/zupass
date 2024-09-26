import { requestDownloadAndDecryptStorage } from "@pcd/passport-interface";
import { Button, Spacer } from "@pcd/passport-ui";
import { ReactNode, useCallback, useState } from "react";
import urljoin from "url-join";
import * as v from "valibot";
import { appConfig } from "../../../src/appConfig";
import { useDispatch } from "../../../src/appHooks";
import { H1, TextCenter } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { Spinner } from "../../shared/Spinner";

const AuthMessage = v.object({
  type: v.literal("auth"),
  encryptionKey: v.string()
});

export type AuthMessage = v.InferOutput<typeof AuthMessage>;

enum PopupAuthenticationStatus {
  Start,
  PopupOpen,
  PopupBlocked,
  PopupClosed,
  Authenticating,
  AuthenticationError
}

/**
 * This screen is only ever shown in a popup modal. It is used when Zupass is
 * embedded in an iframe but has not been authenticated yet, and it opens a
 * popup window which will handle authentication and post an encryption key
 * back to the iframe.
 *
 * After we get the encryption key, we log in. This will trigger an event in
 * {@link useZappServer} which will tell the Zapp to close the modal window.
 */
export function ConnectPopupScreen(): ReactNode {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PopupAuthenticationStatus>(
    PopupAuthenticationStatus.Start
  );
  const dispatch = useDispatch();
  const tryToLogin = useCallback(
    async (encryptionKey: string) => {
      // Try to download and decrypt the storage
      const storageRequest = await requestDownloadAndDecryptStorage(
        appConfig.zupassServer,
        encryptionKey
      );
      if (storageRequest.success) {
        // Success, log in
        dispatch({
          type: "load-after-login",
          storage: storageRequest.value,
          encryptionKey
        });
      } else {
        // Something unexpected went wrong
        setError(
          "Unable to log in automatically, please enter your email to log in"
        );
      }
    },
    [dispatch]
  );

  const openPopup = useCallback(() => {
    const popup = window.open(
      urljoin(window.origin, "/#/authenticate-iframe"),
      "_blank",
      "width=500,height=500,popup=true"
    );
    if (!popup) {
      setStatus(PopupAuthenticationStatus.PopupBlocked);
      return;
    }

    // If the user closes the popup, we need to abort the message listener
    const abortReceiveMessage = new AbortController();

    const interval = window.setInterval(() => {
      // The user may close the popup without authenticating, in which case we
      // need to show a message to the user telling them not to do this.
      // There is no reliable event for detecting this, so we have to check
      // using a timer.
      if (popup.closed) {
        setStatus(PopupAuthenticationStatus.PopupClosed);
        clearInterval(interval);
        // Race conditions are a risk here, so we wait 250ms to ensure that
        // the popup has had a chance to send a message.
        window.setTimeout(() => {
          abortReceiveMessage.abort();
        }, 250);
      }
    }, 250);

    window.addEventListener(
      "message",
      (event) => {
        console.log("message", event);
        if (event.origin !== window.origin || event.source !== popup) {
          return;
        }

        // Check if the message is an authentication message
        const parsed = v.safeParse(AuthMessage, event.data);
        if (parsed.success) {
          event.ports[0].postMessage("ACK");
          tryToLogin(parsed.output.encryptionKey);
        }
      },
      { signal: abortReceiveMessage.signal }
    );
  }, [tryToLogin]);

  const inProgress =
    status === PopupAuthenticationStatus.PopupOpen ||
    status === PopupAuthenticationStatus.Authenticating;

  return (
    <AppContainer bg="primary">
      <Spacer h={64} />
      <TextCenter>
        <H1>ZUPASS</H1>
        <Spacer h={24} />
        <Button onClick={openPopup} disabled={inProgress}>
          <Spinner show={inProgress} text="Connect" />
        </Button>
        <Spacer h={8} />
        {error && <TextCenter>{error}</TextCenter>}
      </TextCenter>
    </AppContainer>
  );
}
