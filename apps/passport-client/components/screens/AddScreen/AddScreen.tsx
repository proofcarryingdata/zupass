import {
  PCDAddRequest,
  PCDProveAndAddRequest,
  PCDRequestType,
} from "@pcd/passport-interface";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../../src/dispatch";
import { validateRequest } from "../../../src/passportRequest";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { ErrorPopup } from "../../modals/ErrorPopup";
import { AppContainer } from "../../shared/AppContainer";
import { JustAddScreen } from "./JustAddScreen";
import { ProveAndAddScreen } from "./ProveAndAddScreen";

/**
 * Asks user if they want to add the given PCD to their passport. The
 * PCD can either be a `SerializedPCD` passed in via a url, or one that
 * is freshly generated in-passport via a proving screen.
 */
export function AddScreen() {
  const location = useLocation();
  const [state, _dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = validateRequest(params);
  useSyncE2EEStorage();

  if (state.self == null) {
    sessionStorage.pendingAddRequest = JSON.stringify(request);
    window.location.href = "/#/login";
    window.location.reload();
    return null;
  }

  if (request.type === PCDRequestType.ProveAndAdd) {
    return <ProveAndAddScreen request={request as PCDProveAndAddRequest} />;
  }

  if (request.type === PCDRequestType.Add) {
    return <JustAddScreen request={request as PCDAddRequest} />;
  }

  // Need to do this instead of using an error dispatch as that will lead to an
  // infinite loop of error dispatches as the state updates
  return (
    <AppContainer bg="gray">
      <ErrorPopup
        error={{
          title: "Unsupported request",
          message: "Expected a PCD ADD request",
        }}
        onClose={() => {
          window.location.hash = "#/";
        }}
      />
    </AppContainer>
  );
}
