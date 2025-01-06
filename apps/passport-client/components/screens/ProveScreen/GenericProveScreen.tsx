import {
  PCDGetRequest,
  PCDRequestType,
  PendingPCD,
  postPendingPCDMessage,
  postSerializedMultiPCDMessage,
  postSerializedPCDMessage
} from "@pcd/passport-interface";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { useCallback } from "react";
import styled from "styled-components";
import { Typography } from "../../../new-components/shared/Typography";
import { useDispatch, useProveState } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { err } from "../../../src/util";
import { GenericProveSection } from "./GenericProveSection";

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

/**
 * Throws an error that indicates that the current window does not have an
 * opener, and that the user should try again using a different browser.
 *
 * If the user requests a proof to be returned via `postMessage`, then the
 * current window should have an opener - the window that opened the Zupass
 * popup. However, some browsers seem not to set the `opener` property, so
 * we need to check for that and throw an error if it's not set.
 *
 * To date, this seems to occur in in-app browsers like Metamask. However, it
 * has also been reported on Chrome, although we're not yet sure what browser
 * settings/extensions may be causing it.
 *
 * See "onProveCallback" below for more context.
 */
function throwNoOpenerError(): never {
  throw new Error(
    "Zupass was unable to send your proof. Please retry this on a different browser or device."
  );
}

/**
 * Renders a UI in response to a request from Zupass to calculate
 * a particular PCD. For arguments which are filled in by the requester
 * of the PCD, displays those hardcoded values. For arguments that the
 * user must fill in, like numbers, strings, and other PCDs, displays
 * HTML input fields that users will fill in by hand. For arguments that
 * are objects, supports loading from a URL.
 */
export function GenericProveScreen({
  req,
  onProve
}: {
  req: PCDGetRequest;
  onProve?: (
    _pcd: PCD,
    serialized: SerializedPCD | undefined,
    pendingPCD: PendingPCD | undefined,
    multiplePCDs?: SerializedPCD[]
  ) => void;
}): JSX.Element | null {
  const dispatch = useDispatch();
  const onProveCallback = useCallback(
    (
      _pcd: PCD,
      serialized: SerializedPCD | undefined,
      pendingPCD: PendingPCD | undefined,
      multiplePCDs?: SerializedPCD[]
    ) => {
      if (pendingPCD) {
        if (req.postMessage) {
          if (window.opener) {
            postPendingPCDMessage(window.opener, pendingPCD);
            window.close();
          } else {
            // Opener doesn't exist, so we can't send the proof.
            throwNoOpenerError();
          }
        }
        safeRedirectPending(req.returnUrl, pendingPCD);
      } else if (multiplePCDs !== undefined) {
        if (req.postMessage) {
          if (window.opener) {
            postSerializedMultiPCDMessage(window.opener, multiplePCDs);
            window.close();
          } else {
            throwNoOpenerError();
          }
        }
        safeRedirect(req.returnUrl, undefined, multiplePCDs);
      } else {
        if (req.postMessage) {
          if (window.opener) {
            if (serialized) {
              postSerializedPCDMessage(window.opener, serialized);
            }
            window.close();
          } else {
            throwNoOpenerError();
          }
        }
        safeRedirect(req.returnUrl, serialized);
      }
    },
    [req.postMessage, req.returnUrl]
  );

  const proveState = useProveState();
  // This allows us to pass in a custom onProve function for use in embedded
  // screens.
  if (!onProve) {
    onProve = onProveCallback;
  }

  if (req.type !== PCDRequestType.Get) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  return (
    <Container>
      <Header>
        <Typography color="var(--text-primary)" fontSize={20} fontWeight={800}>
          SIGN IN WITH ZUPASS
        </Typography>
        {!!proveState && (
          <Typography color="var(--text-primary)" fontSize={16}>
            {req.options?.description}
          </Typography>
        )}
        {proveState !== undefined && !proveState && (
          <>
            <Typography
              style={{ marginTop: 20 }}
              color="var(--text-primary)"
              fontSize={16}
            >
              We don't see an upcoming event that matches the emails under your
              account. Please try switching your account below.
            </Typography>
            <Typography
              style={{ marginTop: 20 }}
              color="var(--text-primary)"
              fontSize={16}
            >
              If you continue to have issues, please contact{" "}
              <a style={{ fontWeight: 500 }} href="mailto:support@zupass.org">
                support@zupass.org
              </a>
              .
            </Typography>
          </>
        )}
      </Header>
      <GenericProveSection
        initialArgs={req.args}
        onProve={onProve}
        pcdType={req.pcdType}
        options={req.options}
        originalReq={req}
      />
    </Container>
  );
}
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
`;
