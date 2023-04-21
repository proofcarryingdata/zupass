import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import * as React from "react";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../../src/dispatch";
import { err } from "../../../src/util";
import { CenterColumn, H2, Spacer } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";

export function ProveScreen() {
  const location = useLocation();
  const [state, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request")) as PCDGetRequest;

  if (request.type !== PCDRequestType.Get) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  if (state.self == null) {
    sessionStorage.pendingProofRequest = JSON.stringify(request);
    window.location.href = "/#/login";
    window.location.reload();
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
      <Spacer h={24} />
      <H2>{title.toUpperCase()}</H2>
      <Spacer h={24} />
      <CenterColumn w={280}>{body}</CenterColumn>
      <Spacer h={24} />
    </AppContainer>
  );
}
