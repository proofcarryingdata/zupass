import { PCDGetRequest, PendingPCD } from "@pcd/passport-interface";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { ReactNode, useCallback } from "react";
import { useEmbeddedScreenState } from "../../../src/appHooks";
import { EmbeddedScreenType } from "../../../src/embedded";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { GenericProveScreen } from "../ProveScreen/GenericProveScreen";

/**
 * EmbeddedScreen is used to control the UI when embedded in an iframe.
 */
export function EmbeddedScreen(): ReactNode {
  const embeddedScreen = useEmbeddedScreenState();
  useSyncE2EEStorage();
  if (!embeddedScreen) {
    return null;
  }
  if (embeddedScreen.screen?.type === EmbeddedScreenType.EmbeddedGetRequest) {
    return (
      <EmbeddedGetRequest
        request={embeddedScreen.screen.request}
        callback={embeddedScreen.screen.callback}
      />
    );
  }
  if (
    embeddedScreen.screen?.type === EmbeddedScreenType.EmbeddedAccessRequest
  ) {
    return <div>Embedded Access Request</div>;
  }
  return <div></div>;
}

function EmbeddedGetRequest({
  request,
  callback
}: {
  request: PCDGetRequest;
  callback: (serialized: SerializedPCD) => void;
}): ReactNode {
  const onProve = useCallback(
    (
      pcd: PCD,
      serialized: SerializedPCD | undefined,
      _pendingPCD: PendingPCD | undefined,
      _multiplePCDs?: SerializedPCD[]
    ) => {
      if (serialized) {
        callback(serialized);
      }
    },
    [callback]
  );
  return <GenericProveScreen req={request} onProve={onProve} />;
}
