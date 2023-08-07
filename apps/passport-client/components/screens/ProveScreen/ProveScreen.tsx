import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelf } from "../../../src/appHooks";
import { err } from "../../../src/util";
import { CenterColumn, H2, Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";

export function ProveScreen() {
  const location = useLocation();
  const dispatch = useDispatch();
  const self = useSelf();
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request")) as PCDGetRequest;

  const screen = getScreen(request);
  useEffect(() => {
    if (screen === null) {
      err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    }
  }, [dispatch, screen]);

  if (self == null) {
    sessionStorage.pendingProofRequest = JSON.stringify(request);
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

function getScreen(request: PCDGetRequest) {
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
    <AppContainer bg="gray">
      <MaybeModal fullScreen />
      <Spacer h={24} />
      <H2>{title.toUpperCase()}</H2>
      <Spacer h={24} />
      <CenterColumn w={280}>{body}</CenterColumn>
      <Spacer h={24} />
    </AppContainer>
  );
}
