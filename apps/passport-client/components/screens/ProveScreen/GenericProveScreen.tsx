import {
  PCDGetRequest,
  PCDRequestType,
  PendingPCD
} from "@pcd/passport-interface";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { useCallback } from "react";
import { useDispatch } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { err } from "../../../src/util";
import { H2, Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { GenericProveSection } from "./GenericProveSection";

/**
 * Renders a UI in response to a request from Zupass to calculate
 * a particular PCD. For arguments which are filled in by the requester
 * of the PCD, displays those hardcoded values. For arguments that the
 * user must fill in, like numbers, strings, and other PCDs, displays
 * HTML input fields that users will fill in by hand. For arguments that
 * are objects, supports loading from a URL.
 */
export function GenericProveScreen({
  req
}: {
  req: PCDGetRequest;
}): JSX.Element | null {
  const dispatch = useDispatch();

  const onProve = useCallback(
    (
      _pcd: PCD,
      serialized: SerializedPCD | undefined,
      pendingPCD: PendingPCD | undefined
    ) => {
      if (pendingPCD) {
        safeRedirectPending(req.returnUrl, pendingPCD);
      } else {
        safeRedirect(req.returnUrl, serialized);
      }
    },
    [req.returnUrl]
  );

  if (req.type !== PCDRequestType.Get) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  return (
    <>
      <MaybeModal fullScreen isProveOrAddScreen={true} />
      <AppContainer bg="gray">
        <AppHeader isProveOrAddScreen={true}>
          <H2
            style={{
              flex: 1,
              textAlign: "center"
            }}
          >
            {req.options?.title ?? "Prove " + req.pcdType}
          </H2>
        </AppHeader>
        <GenericProveSection
          initialArgs={req.args}
          onProve={onProve}
          pcdType={req.pcdType}
          options={req.options}
        />
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}
