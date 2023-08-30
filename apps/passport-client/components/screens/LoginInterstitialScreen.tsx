import { useEffect } from "react";
import { useLoadedIssuedPCDs } from "../../src/appHooks";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";

// todo: handle case when user is logged in - they shouldn't be able to get to this screen
export function LoginInterstitialScreen() {
  useSyncE2EEStorage();

  const loadedIssuedPCDs = useLoadedIssuedPCDs();

  useEffect(() => {
    if (loadedIssuedPCDs) {
      window.location.href = "#/";
    }
  }, [loadedIssuedPCDs]);

  // todo: style this
  return (
    <div>login interstitial {loadedIssuedPCDs ? "LOADED" : "LOADING"}</div>
  );
}
