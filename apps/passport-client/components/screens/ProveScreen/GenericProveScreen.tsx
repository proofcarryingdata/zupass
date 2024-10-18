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
import { useDispatch } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { err } from "../../../src/util";
import { GenericProveSection } from "./GenericProveSection";
import styled from "styled-components";
import { Typography } from "../../../new-components/shared/Typography";

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

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
        if (window.opener && req.postMessage) {
          postPendingPCDMessage(window.opener, pendingPCD);
          window.close();
        }
        safeRedirectPending(req.returnUrl, pendingPCD);
      } else if (multiplePCDs !== undefined) {
        if (window.opener && req.postMessage) {
          postSerializedMultiPCDMessage(window.opener, multiplePCDs);
          window.close();
        }
        safeRedirect(req.returnUrl, undefined, multiplePCDs);
      } else {
        if (window.opener && req.postMessage) {
          if (serialized) {
            postSerializedPCDMessage(window.opener, serialized);
          }
          window.close();
        }
        safeRedirect(req.returnUrl, serialized);
      }
    },
    [req.postMessage, req.returnUrl]
  );

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
        <Typography color="var(--text-primary)" fontSize={16}>
          {req.options?.description}
        </Typography>
      </Header>
      <GenericProveSection
        initialArgs={req.args}
        onProve={onProve}
        pcdType={req.pcdType}
        options={req.options}
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
