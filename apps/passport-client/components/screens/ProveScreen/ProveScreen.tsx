import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { ManageEmailModal } from "../../../new-components/shared/Modals/ManageEmailsModal";
import { ProveModal } from "../../../new-components/shared/Modals/ProveModal";
import { NewLoader } from "../../../new-components/shared/NewLoader";
import {
  useDispatch,
  useIsSyncSettled,
  useLoginIfNoSelf,
  useSelf
} from "../../../src/appHooks";
import { pendingRequestKeys } from "../../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { GenericProveScreen } from "./GenericProveScreen";
import { SemaphoreGroupProveScreen } from "./SemaphoreGroupProveScreen";
import { SemaphoreSignatureProveScreen } from "./SemaphoreSignatureProveScreen";

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
  const syncSettled = useIsSyncSettled();
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

  if (!syncSettled) {
    return <NewLoader />;
  }

  return (
    <>
      <ProveModal />;
      <ManageEmailModal />
    </>
  );
};
