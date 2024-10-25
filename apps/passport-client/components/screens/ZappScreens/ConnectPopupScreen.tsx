import { requestDownloadAndDecryptStorage } from "@pcd/passport-interface";
import { Button, Spacer } from "@pcd/passport-ui";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import urljoin from "url-join";
import * as v from "valibot";
import { appConfig } from "../../../src/appConfig";
import { useDispatch } from "../../../src/appHooks";
import { useSelector } from "../../../src/subscribe";
import { H1, TextCenter } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { Spinner } from "../../shared/Spinner";

const IFrameAuthenticationMessageSchema = v.object({
  type: v.literal("auth"),
  encryptionKey: v.string()
});

export type IFrameAuthenticationMessage = v.InferOutput<
  typeof IFrameAuthenticationMessageSchema
>;

enum PopupAuthenticationStatus {
  Start = "Start",
  PopupOpen = "PopupOpen",
  PopupBlocked = "PopupBlocked",
  PopupClosed = "PopupClosed",
  Authenticating = "Authenticating",
  AuthenticationError = "AuthenticationError"
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
  const [status, setStatus] = useState<PopupAuthenticationStatus>(
    PopupAuthenticationStatus.Start
  );
  const dispatch = useDispatch();
  const tryToLogin = useCallback(
    async (encryptionKey: string): Promise<boolean> => {
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
        return true;
      } else {
        return false;
      }
    },
    [dispatch]
  );

  const messageListenerAbortRef = useRef<AbortController | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    let closeCheckInterval: number;
    let closeNotifyTimeout: number;
    if (status === PopupAuthenticationStatus.PopupOpen) {
      closeCheckInterval = window.setInterval(() => {
        // The user may close the popup without authenticating, in which case we
        // need to show a message to the user telling them not to do this.
        // There is no reliable event for detecting this, so we have to check
        // using a timer.
        if (popupRef.current && popupRef.current.closed) {
          clearInterval(closeCheckInterval);
          // Race conditions are a risk here, so we wait 250ms to ensure that
          // the popup has had a chance to send a message.
          closeNotifyTimeout = window.setTimeout(() => {
            if (status === PopupAuthenticationStatus.PopupOpen) {
              setStatus(PopupAuthenticationStatus.PopupClosed);
              messageListenerAbortRef.current?.abort();
            }
          }, 250);
        }
      }, 250);
      return () => {
        if (closeCheckInterval) {
          clearInterval(closeCheckInterval);
        }
        if (closeNotifyTimeout) {
          clearTimeout(closeNotifyTimeout);
        }
      };
    }
  }, [status]);

  useEffect(() => {
    if (
      status === PopupAuthenticationStatus.PopupOpen ||
      status === PopupAuthenticationStatus.PopupBlocked
    ) {
      // If the user closes the popup, we need to abort the message listener
      const messageListenerAbort = new AbortController();

      // If we already have a message listener, abort it
      if (messageListenerAbortRef.current) {
        messageListenerAbortRef.current.abort();
      }
      messageListenerAbortRef.current = messageListenerAbort;

      window.addEventListener(
        "message",
        async (event) => {
          if (event.origin !== window.origin) {
            return;
          }

          // Check if the message is an authentication message
          const parsed = v.safeParse(
            IFrameAuthenticationMessageSchema,
            event.data
          );
          if (
            parsed.success &&
            status === PopupAuthenticationStatus.PopupOpen
          ) {
            setStatus(PopupAuthenticationStatus.Authenticating);
            // Sending this message back to the iframe lets it know that
            // we've received the authentication message and it's okay to
            // close
            event.ports[0].postMessage("ACK");
            const loginResult = await tryToLogin(parsed.output.encryptionKey);
            if (!loginResult) {
              setStatus(PopupAuthenticationStatus.AuthenticationError);
            }
          }
        },
        { signal: messageListenerAbort.signal }
      );
    }
  }, [status, tryToLogin]);

  const openPopup = useCallback(() => {
    const popup = window.open(
      urljoin(window.origin, "/#/authenticate-iframe"),
      "_blank",
      "width=500,height=500,popup=true"
    );
    if (!popup) {
      // Although the popup was blocked, the user may cause it to open by
      // allowing the browser to open it, so we should continue to set up
      // the message listener.
      setStatus(PopupAuthenticationStatus.PopupBlocked);
    } else {
      setStatus(PopupAuthenticationStatus.PopupOpen);
      popupRef.current = popup;
    }
  }, []);

  const inProgress =
    status === PopupAuthenticationStatus.PopupOpen ||
    status === PopupAuthenticationStatus.Authenticating;

  const zappName = useSelector((state) => state.connectedZapp?.name);
  const zappOrigin = useSelector((state) => state.zappOrigin);

  return (
    <AppContainer bg="primary">
      <Spacer h={32} />
      <TextCenter>
        <H1>ZUPASS</H1>
        <Spacer h={24} />
        <TextCenter>
          <ZappName>{zappName}</ZappName> ({zappOrigin}) would like to connect
          to your Zupass.
        </TextCenter>
        <Spacer h={24} />
        <Button onClick={openPopup} disabled={inProgress}>
          <Spinner show={inProgress} text="Connect" />
        </Button>
        <Spacer h={24} />
        {status === PopupAuthenticationStatus.PopupBlocked && (
          <TextCenter>
            Your browser may be configured to block popup windows. Please check
            your browser settings and click the button above to try again.
          </TextCenter>
        )}
        {status === PopupAuthenticationStatus.AuthenticationError && (
          <TextCenter>
            An unexpected error occurred. Please try again.
          </TextCenter>
        )}
        {status === PopupAuthenticationStatus.PopupClosed && (
          <TextCenter>
            The popup window was closed before authentication could complete.
            Please try again by clicking the button above.
          </TextCenter>
        )}
        <Spacer h={24} />
        <TextCenter>
          <Button onClick={() => dispatch({ type: "zapp-cancel-connect" })}>
            Cancel
          </Button>
        </TextCenter>
      </TextCenter>
    </AppContainer>
  );
}

const ZappName = styled.span`
  font-weight: bold;
`;
