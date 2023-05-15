import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../../src/dispatch";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { err } from "../../../src/util";
import { AppContainer } from "../../shared/AppContainer";
import { AddHaloScreen } from "./AddHaloScreen";

/**
 * Specific landing page for adding a HaloNoncePCD, which in the case of Zupass
 * corresponds to a specific Zuzalu Experience.
 */
export function HaloScreen() {
  const location = useLocation();
  const [state, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  useSyncE2EEStorage();

  const screen = getScreen(params);
  useEffect(() => {
    if (screen === null) {
      err(dispatch, "Unsupported request", `Expected a Halo signature URL`);
    }
  }, [dispatch, screen]);

  if (state.self == null) {
    sessionStorage.pendingHaloRequest = location.search;
    window.location.href = "/#/login";
    window.location.reload();
    return null;
  }

  if (screen == null) {
    // Need AppContainer to display error
    return <AppContainer bg="gray" />;
  }
  return screen;
}

function getScreen(params: URLSearchParams) {
  const pk2 = params.get("pk2");
  const rnd = params.get("rnd");
  const rndsig = params.get("rndsig");

  if (pk2 == null || rnd == null || rndsig == null) {
    return null;
  } else {
    return <AddHaloScreen pk2={pk2} rnd={rnd} rndsig={rndsig} />;
  }
}
