import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  useDispatch,
  useIsSyncSettled,
  useLoginIfNoSelf,
  useSelf
} from "../../../src/appHooks";
import { pendingRequestKeys } from "../../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { err } from "../../../src/util";
import { CenterColumn, H2, Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";

export function ProveScreen(): JSX.Element | null {
  useSyncE2EEStorage();
  const syncSettled = useIsSyncSettled();
  const location = useLocation();
  const dispatch = useDispatch();
  const self = useSelf();
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request") ?? "{}") as PCDGetRequest;
  const screen = getScreen(request);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // NB: Telegram bot doesn't support localhost url and we had to use 127.0.0.1 instead
      // We redirect back to localhost in development mode
      if (window.location.hostname === "127.0.0.1") {
        window.location.replace(
          window.location.href.replace("://127.0.0.1", "://localhost")
        );
      }
    }
  }, []);

  useEffect(() => {
    if (screen === null) {
      err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    }
  }, [dispatch, screen]);

  useLoginIfNoSelf(pendingRequestKeys.proof, request);

  if (!self) {
    return null;
  }

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

export function getScreen(request: PCDGetRequest): JSX.Element | null {
  if (request.type !== PCDRequestType.Get) {
    return null;
  }

  if (request.options?.genericProveScreen) {
    return <GenericProveScreen req={request} />;
  } else if (request.pcdType === SemaphoreGroupPCDPackage.name) {
    return <SemaphoreGroupProveScreen req={request} />;
  } else if (request.pcdType === SemaphoreSignaturePCDPackage.name) {
    return <SemaphoreSignatureProveScreen req={request} />;
  } else {
    return <GenericProveScreen req={request} />;
  }
}
