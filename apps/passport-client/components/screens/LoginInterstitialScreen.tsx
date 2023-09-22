import { Spacer } from "@pcd/passport-ui";
import { useEffect, useLayoutEffect } from "react";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useLoadedIssuedPCDs } from "../../src/appHooks";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { BackgroundGlow, CenterColumn } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";

export function LoginInterstitialScreen() {
  useSyncE2EEStorage();

  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  const dispatch = useDispatch();

  useEffect(() => {
    if (loadedIssuedPCDs || appConfig.isZuzalu) {
      dispatch({ type: "post-login-redirect" });
    }
  }, [loadedIssuedPCDs, dispatch]);

  // scroll to top when we navigate to this page
  useLayoutEffect(() => {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }, []);

  return (
    <>
      <AppContainer bg="primary">
        <BackgroundGlow
          y={224}
          from="var(--bg-lite-primary)"
          to="var(--bg-dark-primary)"
        >
          <Spacer h={64} />
          <CenterColumn w={280}>
            <RippleLoader />
          </CenterColumn>
        </BackgroundGlow>
      </AppContainer>
    </>
  );
}
