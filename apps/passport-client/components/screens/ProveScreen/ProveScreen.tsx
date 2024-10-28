import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { ProveModal } from "../../../new-components/shared/Modals/ProveModal";
import { useDispatch } from "../../../src/appHooks";
import { useSearchParams } from "react-router-dom";
import { ReactElement } from "react";

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

export const ProveScreen = (): ReactElement => {
  const [params] = useSearchParams();
  const request = JSON.parse(params.get("request") ?? "{}") as PCDGetRequest;
  const dispatch = useDispatch();
  dispatch({
    type: "set-bottom-modal",
    modal: { request, modalType: "prove" }
  });
  return <ProveModal />;
};
