import { Spacer } from "@pcd/passport-ui";
import { useEffect } from "react";
import { useLoadedIssuedPCDs } from "../../src/appHooks";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { BackgroundGlow, CenterColumn } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";

export function LoginInterstitialScreen() {
  useSyncE2EEStorage();

  const loadedIssuedPCDs = useLoadedIssuedPCDs();

  useEffect(() => {
    if (loadedIssuedPCDs) {
      window.location.href = "#/";
    }
  }, [loadedIssuedPCDs]);

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
