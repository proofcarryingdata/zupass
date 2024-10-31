import { PCDGetRequest, PendingPCD } from "@pcd/passport-interface";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { assertUnreachable } from "@pcd/util";
import { ReactNode, useCallback } from "react";
import { useEmbeddedScreenState } from "../../../src/appHooks";
import { EmbeddedScreenType } from "../../../src/embedded";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { GenericProveScreen } from "../ProveScreen/GenericProveScreen";
import { EmbeddedGPCProofScreen } from "./EmbeddedGPCProofScreen";
import { EmbeddedSignPODScreen } from "./EmbeddedSignPODScreen";

/**
 * EmbeddedScreen is used to control the UI when embedded in an iframe.
 */
export function EmbeddedScreen(): ReactNode {
  const embeddedScreen = useEmbeddedScreenState();
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
  } else if (
    embeddedScreen.screen?.type === EmbeddedScreenType.EmbeddedGPCProof
  ) {
    return (
      <EmbeddedGPCProofScreen
        proofRequestSchema={embeddedScreen.screen.proofRequest}
        callback={embeddedScreen.screen.callback}
        collectionIds={embeddedScreen.screen.collectionIds}
      />
    );
  } else if (
    embeddedScreen.screen?.type === EmbeddedScreenType.EmbeddedSignPOD
  ) {
    return (
      <EmbeddedSignPODScreen
        entries={embeddedScreen.screen.entries}
        callback={embeddedScreen.screen.callback}
        onCancel={embeddedScreen.screen.onCancel}
      />
    );
  } else if (embeddedScreen.screen === undefined) {
    return <DefaultEmbeddedScreen />;
  }
  assertUnreachable(embeddedScreen.screen);
}

function DefaultEmbeddedScreen(): ReactNode {
  useSyncE2EEStorage();
  return <div></div>;
}

function EmbeddedGetRequest({
  request,
  callback
}: {
  request: PCDGetRequest;
  callback: (serialized: SerializedPCD) => void;
}): ReactNode {
  useSyncE2EEStorage();
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
