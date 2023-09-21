import { Spacer } from "@pcd/passport-ui";
import { useEffect, useLayoutEffect } from "react";
import { appConfig } from "../../src/appConfig";
import { useLoadedIssuedPCDs } from "../../src/appHooks";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { BackgroundGlow, CenterColumn } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";

export function LoginInterstitialScreen() {
  useSyncE2EEStorage();

  const loadedIssuedPCDs = useLoadedIssuedPCDs();

  useEffect(() => {
    if (loadedIssuedPCDs || appConfig.isZuzalu) {
      window.location.href = "#/";
    }
  }, [loadedIssuedPCDs]);

  // scroll to top when we navigate to this page
  useLayoutEffect(() => {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }, []);

  return (
    <>
      <AppContainer>
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
