import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";

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
