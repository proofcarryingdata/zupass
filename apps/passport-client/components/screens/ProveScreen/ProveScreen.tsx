import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../../src/dispatch";
import { CenterColumn, H2, Spacer } from "../../core";
import { ErrorPopup } from "../../modals/ErrorPopup";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";

export function ProveScreen() {
  const location = useLocation();
  const [state, _dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request")) as PCDGetRequest;

  if (request.type !== PCDRequestType.Get) {
    // Need to do this instead of using an error dispatch as that will lead to an
    // infinite loop of error dispatches as the state updates
    <AppContainer bg="gray">
      <ErrorPopup
        error={{
          title: "Unsupported request",
          message: "Expected a PCD GET request",
        }}
        onClose={() => {
          window.location.hash = "#/";
        }}
      />
    </AppContainer>;
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
      <MaybeModal fullScreen />
      <Spacer h={24} />
      <H2>{title.toUpperCase()}</H2>
      <Spacer h={24} />
      <CenterColumn w={280}>{body}</CenterColumn>
      <Spacer h={24} />
    </AppContainer>
  );
}
