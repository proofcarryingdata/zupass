import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  useDispatch,
  useIsSyncSettled,
  useSelf,
  useUserForcedToLogout
} from "../../../src/appHooks";
import {
  clearAllPendingRequests,
  pendingProofRequestKey,
  setPendingProofRequest
} from "../../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { err } from "../../../src/util";
import { CenterColumn, H2, Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";

export function ProveScreen(): JSX.Element {
  useSyncE2EEStorage();
  const syncSettled = useIsSyncSettled();
  const location = useLocation();
  const dispatch = useDispatch();
  const self = useSelf();
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request")) as PCDGetRequest;
  const screen = getScreen(request);
  const userForcedToLogout = useUserForcedToLogout();

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

  useEffect(() => {
    if (self == null || userForcedToLogout) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(request);
      setPendingProofRequest(stringifiedRequest);
      if (self == null) {
        window.location.href = `/#/login?redirectedFromAction=true&${pendingProofRequestKey}=${encodeURIComponent(
          stringifiedRequest
        )}`;
      }
    }
  }, [request, self, userForcedToLogout]);

  if (self == null) {
    return null;
  }

  if (!syncSettled) {
    return (
      <AppContainer bg="gray">
        <SyncingPCDs />
      </AppContainer>
    );
  }

  if (screen == null) {
    // Need AppContainer to display error
    return <AppContainer bg="gray" />;
  }

  return screen;
}

function getScreen(request: PCDGetRequest): JSX.Element | null {
  if (request.type !== PCDRequestType.Get) {
    return null;
  }

  let title: string;
  let body: JSX.Element;

  if (request.options?.genericProveScreen) {
    return <GenericProveScreen req={request} />;
  } else if (request.pcdType === SemaphoreGroupPCDPackage.name) {
    if (request.options?.title !== undefined) {
      title = request.options?.title;
    } else {
      title = "Prove membership";
    }
    body = <SemaphoreGroupProveScreen req={request} />;
  } else if (request.pcdType === SemaphoreSignaturePCDPackage.name) {
    if (request.options?.title !== undefined) {
      title = request.options?.title;
    } else {
      title = "Sign a message";
    }
    body = <SemaphoreSignatureProveScreen req={request} />;
  } else {
    return <GenericProveScreen req={request} />;
  }

  return (
    <>
      <MaybeModal fullScreen isProveOrAddScreen={true} />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <H2>{title.toUpperCase()}</H2>
        <Spacer h={24} />
        <CenterColumn>{body}</CenterColumn>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
