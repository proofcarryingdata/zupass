import { PCDProveAndAddRequest } from "@pcd/passport-interface";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { getErrorMessage } from "@pcd/util";
import { ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { NewModals } from "../../../new-components/shared/Modals/NewModals";
import {
  useDispatch,
  useIsSyncSettled,
  useLoginIfNoSelf
} from "../../../src/appHooks";
import { safeRedirect } from "../../../src/passportRequest";
import { pendingRequestKeys } from "../../../src/sessionStorage";
import { err } from "../../../src/util";
import { H2, Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AddedPCD } from "../../shared/AddedPCD";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { GenericProveSection } from "../ProveScreen/GenericProveSection";

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
    <>
      <MaybeModal fullScreen isProveOrAddScreen={true} />
      <NewModals />
      <AppContainer bg="gray">
        <Container>
          <Spacer h={24} />
          <AppHeader isProveOrAddScreen={true}>
            <H2 col="var(--text-primary)" style={{ fontFamily: "Barlow" }}>
              {request.options?.title ?? `Add and Prove ${request.pcdType}`}
            </H2>
          </AppHeader>
          <Spacer h={16} />
          {content}
        </Container>
      </AppContainer>
    </>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  max-width: 100%;
`;
