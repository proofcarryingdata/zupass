import {
  PCDGetRequest,
  PCDRequestType,
  PendingPCD,
} from "@pcd/passport-interface";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { useCallback, useContext } from "react";
import { DispatchContext } from "../../../src/dispatch";
import {
  safeRedirect,
  safeRedirectPending,
} from "../../../src/passportRequest";
import { err } from "../../../src/util";
import { Spacer } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { GenericProveSection } from "./GenericProveSection";

/**
 * Renders a UI in response to a request from the passport to calculate
 * a particular PCD. For arguments which are filled in by the requester
 * of the PCD, displays those hardcoded values. For arguments that the
 * user must fill in, like numbers, strings, and other PCDs, displays
 * HTML input fields that users will fill in by hand. For arguments that
 * are objects, supports loading from a URL.
 */
export function GenericProveScreen({ req }: { req: PCDGetRequest }) {
  const [_, dispatch] = useContext(DispatchContext);

  const onProve = useCallback(
    async (_pcd: PCD, serialized: SerializedPCD, pendingPCD: PendingPCD) => {
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
    <AppContainer bg="gray">
      <Spacer h={24} />
      <AppHeader />
      <Spacer h={24} />
      <GenericProveSection
        initialArgs={req.args}
        onProve={onProve}
        pcdType={req.pcdType}
        options={req.options}
      />
      <Spacer h={64} />
    </AppContainer>
  );
}
