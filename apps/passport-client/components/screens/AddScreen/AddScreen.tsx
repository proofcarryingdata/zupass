import {
  PCDAddRequest,
  PCDProveAndAddRequest,
  PCDRequest,
  PCDRequestType
} from "@pcd/passport-interface";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  useDispatch,
  useRequirePassword,
  useSelf,
  useUserForcedToLogout
} from "../../../src/appHooks";
import { validateRequest } from "../../../src/passportRequest";
import {
  clearAllPendingRequests,
  pendingAddRequestKey,
  setPendingAddRequest
} from "../../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { err } from "../../../src/util";
import { AppContainer } from "../../shared/AppContainer";
import { JustAddScreen } from "./JustAddScreen";
import { ProveAndAddScreen } from "./ProveAndAddScreen";

/**
 * Asks user if they want to add the given PCD to their Zupass. The
 * PCD can either be a `SerializedPCD` passed in via a url, or one that
 * is freshly generated in Zupass via a proving screen.
 */
export function AddScreen(): JSX.Element {
  useSyncE2EEStorage();
  useRequirePassword();
  const dispatch = useDispatch();
  const self = useSelf();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const request = validateRequest(params);
  const screen = getScreen(request);
  const userForcedToLogout = useUserForcedToLogout();

  useEffect(() => {
    if (screen === null) {
      err(dispatch, "Unsupported request", `Expected a PCD ADD request`);
    }
  }, [dispatch, screen]);

  useEffect(() => {
    if (!self || userForcedToLogout) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(request);
      setPendingAddRequest(stringifiedRequest);
      if (!self) {
        window.location.href = `/#/login?redirectedFromAction=true&${pendingAddRequestKey}=${encodeURIComponent(
          stringifiedRequest
        )}`;
      }
    }
  }, [request, self, userForcedToLogout]);

  if (!self) {
    return null;
  }

  if (!screen) {
    // Need AppContainer to display error
    return <AppContainer bg="gray" />;
  }
  return screen;
}

function getScreen(request: PCDRequest): JSX.Element | null {
  switch (request.type) {
    case PCDRequestType.ProveAndAdd:
      return <ProveAndAddScreen request={request as PCDProveAndAddRequest} />;
    case PCDRequestType.Add:
      return <JustAddScreen request={request as PCDAddRequest} />;
    default:
      return null;
  }
}
