import { PCDProveAndAddRequest } from "@pcd/passport-interface";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { getErrorMessage } from "@pcd/util";
import { ReactNode, useCallback, useState } from "react";
import {
  useDispatch,
  useIsSyncSettled,
  useLoginIfNoSelf
} from "../../../src/appHooks";
import { safeRedirect } from "../../../src/passportRequest";
import { pendingRequestKeys } from "../../../src/sessionStorage";
import { err } from "../../../src/util";
import { AddedPCD } from "../../shared/AddedPCD";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { GenericProveSection } from "../ProveScreen/GenericProveSection";
import { BottomModal } from "../../../new-components/shared/BottomModal";

/**
 * Screen that allows the user to prove a new PCD, and then add it to Zupass.
 */
export function ProveAndAddScreen({
  request
}: {
  request: PCDProveAndAddRequest;
}): JSX.Element {
  const syncSettled = useIsSyncSettled();
  const dispatch = useDispatch();
  const [proved, setProved] = useState(false);
  const [serializedPCD, setSerializedPCD] = useState<
    SerializedPCD | undefined
  >();

  useLoginIfNoSelf(pendingRequestKeys.add, request);

  const onProve = useCallback(
    async (_: PCD | undefined, serializedPCD: SerializedPCD | undefined) => {
      if (serializedPCD) {
        try {
          await dispatch({
            type: "add-pcds",
            pcds: [serializedPCD],
            folder: request.folder
          });
          setProved(true);
          setSerializedPCD(serializedPCD);
        } catch (e) {
          await err(dispatch, "Error Adding PCD", getErrorMessage(e));
        }
      }
    },
    [dispatch, request.folder]
  );

  let content: ReactNode;

  if (!syncSettled) {
    content = <SyncingPCDs />;
  } else if (!proved) {
    content = (
      <GenericProveSection
        initialArgs={request.args}
        pcdType={request.pcdType}
        onProve={onProve}
        folder={request.folder}
      />
    );
  } else {
    content = (
      <AddedPCD
        onCloseClick={(): void => {
          if (request.returnPCD) {
            safeRedirect(request.returnUrl, serializedPCD);
          } else {
            safeRedirect(request.returnUrl);
          }
        }}
      />
    );
  }

  return (
    <BottomModal
      modalContainerStyle={{ padding: 16 }}
      isOpen={true}
      dismissable={false}
    >
      {content}
    </BottomModal>
  );
}
