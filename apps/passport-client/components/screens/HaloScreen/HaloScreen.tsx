import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../../src/dispatch";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { ErrorPopup } from "../../modals/ErrorPopup";
import { AppContainer } from "../../shared/AppContainer";
import { AddHaloScreen } from "./AddHaloScreen";

/**
 * Specific landing page for adding a HaloNoncePCD, which in the case of Zupass
 * corresponds to a specific Zuzalu Experience.
 */
export function HaloScreen() {
  const location = useLocation();
  const [state, _dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  useSyncE2EEStorage();

  if (state.self == null) {
    sessionStorage.pendingHaloRequest = location.search;
    window.location.href = "/#/login";
    window.location.reload();
    return null;
  }

  const pk2 = params.get("pk2");
  const rnd = params.get("rnd");
  const rndsig = params.get("rndsig");
  if (pk2 == null || rnd == null || rndsig == null) {
    // Need to do this instead of using an error dispatch as that will lead to an
    // infinite loop of error dispatches as the state updates
    return (
      <AppContainer bg="gray">
        <ErrorPopup
          error={{
            title: "Unsupported request",
            message: "Expected a Halo signature URL",
          }}
          onClose={() => {
            window.location.hash = "#/";
          }}
        />
      </AppContainer>
    );
  } else {
    return <AddHaloScreen pk2={pk2} rnd={rnd} rndsig={rndsig} />;
  }
}
