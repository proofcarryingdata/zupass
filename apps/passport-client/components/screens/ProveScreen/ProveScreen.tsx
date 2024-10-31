import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { ProveModal } from "../../../new-components/shared/Modals/ProveModal";
import { useDispatch, useLoginIfNoSelf, useSelf } from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";
import { pendingRequestKeys } from "../../../src/sessionStorage";
import { ManageEmailModal } from "../../../new-components/shared/Modals/ManageEmailsModal";

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

export const ProveScreen = (): ReactElement | null => {
  useSyncE2EEStorage();
  const [params] = useSearchParams();
  const self = useSelf();
  const request = JSON.parse(params.get("request") ?? "{}") as PCDGetRequest;
  const dispatch = useDispatch();

  useLoginIfNoSelf(pendingRequestKeys.proof, request);

  if (!self) {
    return null;
  }

  dispatch({
    type: "set-bottom-modal",
    modal: { request, modalType: "prove" }
  });
  return (
    <>
      <ProveModal />;
      <ManageEmailModal />
    </>
  );
};
