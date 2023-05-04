import { PCDProveAndAddRequest } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { ReactNode, useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { safeRedirect } from "../../../src/passportRequest";
import {
  useHasUploaded,
  useIsDownloaded,
} from "../../../src/useSyncE2EEStorage";
import { Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AddedPCD } from "../../shared/AddedPCD";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { GenericProveSection } from "../ProveScreen/GenericProveSection";

/**
 * Screen that allows the user to prove a new PCD, and then add it to the
 * passport.
 */
export function ProveAndAddScreen({
  request,
}: {
  request: PCDProveAndAddRequest;
}) {
  const [_, dispatch] = useContext(DispatchContext);
  const [proved, setProved] = useState(false);
  const [serializedPCD, setSerializedPCD] = useState<
    SerializedPCD | undefined
  >();
  const synced = useHasUploaded();
  const isDownloaded = useIsDownloaded();

  const onProve = useCallback(
    async (_: any, serializedPCD: SerializedPCD) => {
      await dispatch({ type: "add-pcd", pcd: serializedPCD });
      setProved(true);
      setSerializedPCD(serializedPCD);
    },
    [dispatch]
  );

  let content: ReactNode;

  if (!isDownloaded) {
    content = <SyncingPCDs />;
  } else if (!proved) {
    content = (
      <GenericProveSection
        initialArgs={request.args}
        pcdType={request.pcdType}
        onProve={onProve}
      />
    );
  } else if (!synced) {
    content = <SyncingPCDs />;
  } else {
    content = (
      <AddedPCD
        onCloseClick={() => {
          safeRedirect(request.returnUrl, serializedPCD);
        }}
      />
    );
  }

  return (
    <AppContainer bg="gray">
      <MaybeModal fullScreen />
      <Container>
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={16} />
        {content}
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  max-width: 100%;
`;
