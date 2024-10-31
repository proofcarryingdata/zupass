import {
  PCDAddRequest,
  PCDProveAndAddRequest,
  PCDRequest,
  PCDRequestType
} from "@pcd/passport-interface";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "../../../src/appHooks";
import { validateRequest } from "../../../src/passportRequest";
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
export function AddScreen(): JSX.Element | null {
  useSyncE2EEStorage();
  const dispatch = useDispatch();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const request = validateRequest(params);
  const autoAdd = params.get("autoAdd") === "true";
  const screen = getScreen(request, autoAdd);

  useEffect(() => {
    if (screen === null) {
      err(dispatch, "Unsupported request", `Expected a PCD ADD request`);
    }
  }, [dispatch, screen]);

  if (!screen) {
    // Need AppContainer to display error
    return <AppContainer bg="primary" />;
  }
  return screen;
}

function getScreen(request: PCDRequest, autoAdd: boolean): JSX.Element | null {
  switch (request.type) {
    case PCDRequestType.ProveAndAdd:
      return <ProveAndAddScreen request={request as PCDProveAndAddRequest} />;
    case PCDRequestType.Add:
      return (
        <JustAddScreen autoAdd={autoAdd} request={request as PCDAddRequest} />
      );
    default:
      return null;
  }
}
