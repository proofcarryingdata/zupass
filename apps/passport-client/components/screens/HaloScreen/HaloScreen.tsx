import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useIsSyncSettled } from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { err } from "../../../src/util";
import { AppContainer } from "../../shared/AppContainer";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { AddHaloScreen } from "./AddHaloScreen";

/**
 * Specific landing page for adding a HaloNoncePCD, which in the case of Zupass
 * corresponds to a specific Zuzalu Experience.
 */
export function HaloScreen(): JSX.Element {
  useSyncE2EEStorage();
  const syncSettled = useIsSyncSettled();
  const location = useLocation();
  const dispatch = useDispatch();
  const params = new URLSearchParams(location.search);

  const screen = getScreen(params);
  useEffect(() => {
    if (screen === null) {
      err(dispatch, "Unsupported request", `Expected a Halo signature URL`);
    }
  }, [dispatch, screen]);

  if (!syncSettled) {
    return (
      <AppContainer bg="primary">
        <SyncingPCDs />
      </AppContainer>
    );
  }

  if (!screen) {
    // Need AppContainer to display error
    return <AppContainer bg="primary" />;
  }

  return screen;
}

function getScreen(params: URLSearchParams): JSX.Element | null {
  const pk2 = params.get("pk2");
  const rnd = params.get("rnd");
  const rndsig = params.get("rndsig");

  if (!pk2 || !rnd || !rndsig) {
    return null;
  } else {
    return <AddHaloScreen pk2={pk2} rnd={rnd} rndsig={rndsig} />;
  }
}
