import { requestDownloadAndDecryptStorage } from "@pcd/passport-interface";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import urljoin from "url-join";
import * as v from "valibot";
import { BottomModalHeader } from "../../../new-components/shared/BottomModal";
import { Button2 } from "../../../new-components/shared/Button";
import { NewLoader } from "../../../new-components/shared/NewLoader";
import { Typography } from "../../../new-components/shared/Typography";
import { appConfig } from "../../../src/appConfig";
import { useDispatch } from "../../../src/appHooks";
import { BANNER_HEIGHT } from "../../../src/sharedConstants";
import { useSelector } from "../../../src/subscribe";
import { AppContainer } from "../../shared/AppContainer";

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

  const textOrLoader = (text: string): ReactNode => {
    if (inProgress) return <NewLoader columns={3} rows={2} color="white" />;
    return (
      <Typography color="inherit" fontSize={18} fontWeight={500} family="Rubik">
        {text}
      </Typography>
    );
  };
  return (
    <AppContainer bg="white" noPadding>
      <Container>
        <BottomModalHeader
          title="CONNECTION REQUEST"
          description={`${
            zappOrigin || zappName || "The app"
          } would like to connect to your Zupass on this device. Zupass stores your data locally to maintain privacy, so you will need to authenticate again if you switch devices.`}
        />
        <ErrorContainer>
          {status === PopupAuthenticationStatus.PopupBlocked && (
            <Typography color="var(--new-danger)">
              Your browser may be configured to block popup windows. Please
              check your browser settings and click the button above to try
              again.
            </Typography>
          )}
          {status === PopupAuthenticationStatus.AuthenticationError && (
            <Typography color="var(--new-danger)">
              An unexpected error occurred. Please try again.
            </Typography>
          )}
          {status === PopupAuthenticationStatus.PopupClosed && (
            <Typography color="var(--new-danger)">
              The popup window was closed before authentication could complete.
              Please try again by clicking the "Connect" button below.
            </Typography>
          )}
          <ButtonsContainer>
            <Button2 onClick={openPopup} disabled={inProgress}>
              {textOrLoader("Connect")}
            </Button2>
            <Button2
              onClick={() =>
                dispatch({ type: "zapp-approval", approved: false })
              }
              variant="secondary"
            >
              Cancel
            </Button2>
          </ButtonsContainer>
        </ErrorContainer>
      </Container>
    </AppContainer>
  );
}
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: calc(100vh - ${BANNER_HEIGHT}px);
  padding: 24px 24px 20px 24px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;
