import { EdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import {
  PCDAddRequest,
  ProtocolWorldsFolderName,
  requestLogToServer
} from "@pcd/passport-interface";
import { getErrorMessage } from "@pcd/util";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useIsSyncSettled, useSelf } from "../../../src/appHooks";
import { useDeserialized } from "../../../src/useDeserialized";
import { err } from "../../../src/util";
import { Button, H2, Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AddedPCD } from "../../shared/AddedPCD";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { PCDCard } from "../../shared/PCDCard";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { ProtocolWorldsStyling } from "../ProtocolWorldsScreens/ProtocolWorldsStyling";
import { useTensionConfetti } from "../ProtocolWorldsScreens/useTensionConfetti";

/**
 * Screen that allows the user to respond to a `PCDAddRequest` and add
 * a PCD into their wallet without proving it.
 */
export function JustAddScreen({
  request
}: {
  request: PCDAddRequest;
}): JSX.Element {
  const dispatch = useDispatch();
  const [added, setAdded] = useState(false);
  const { error, pcd } = useDeserialized(request.pcd);
  const syncSettled = useIsSyncSettled();
  const self = useSelf();
  const isProtocolWorlds = request.folder === ProtocolWorldsFolderName;
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const confetti = useTensionConfetti(ref);

  const onAddClick = useCallback(async () => {
    try {
      // This is mostly for typechecking and should never throw
      // because <AddScreen /> checks if the user is logged in
      if (!self) {
        throw new Error("User must be logged in");
      }
      await dispatch({
        type: "add-pcds",
        pcds: [request.pcd],
        folder: request.folder
      });
      if (isProtocolWorlds) {
        confetti();
        await requestLogToServer(appConfig.zupassServer, "added-tension", {
          commitment: self.commitment.toString(),
          email: self.email,
          pcd: request.pcd,
          tension: (pcd as EdDSATicketPCD)?.claim?.ticket?.eventName
        });
      }
      setAdded(true);
    } catch (e) {
      await err(dispatch, "Error Adding PCD", getErrorMessage(e));
    }
  }, [
    confetti,
    dispatch,
    request.folder,
    request.pcd,
    self,
    pcd,
    isProtocolWorlds
  ]);

  let content;

  if (!syncSettled) {
    return <SyncingPCDs />;
  } else if (!added) {
    content = (
      <>
        <H2>
          {isProtocolWorlds ? "TENSION DISCOVERED" : "ADD PCD".toUpperCase()}
        </H2>
        <Spacer h={16} />
        {pcd && (
          <PCDCard
            hidePadding={isProtocolWorlds}
            pcd={pcd}
            expanded={true}
            hideRemoveButton={true}
          />
        )}
        {!isProtocolWorlds && request.folder && (
          <div>
            PCD will be added to folder:
            <br /> <strong>{request.folder}</strong>
          </div>
        )}
        {error && JSON.stringify(error)}
        <Spacer h={16} />
        <Button onClick={onAddClick}>
          {isProtocolWorlds ? "Collect" : "Add"}
        </Button>
      </>
    );
  } else if (isProtocolWorlds) {
    window.location.href = "#/?folder=Protocol%2520Worlds";
  } else {
    content = <AddedPCD onCloseClick={(): void => window.close()} />;
  }

  return (
    <>
      {isProtocolWorlds && <ProtocolWorldsStyling />}
      <MaybeModal fullScreen isProveOrAddScreen={true} />
      <AppContainer bg="gray">
        <Container ref={(r) => setRef(r)}>
          <Spacer h={16} />
          <AppHeader isProveOrAddScreen={true} />
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
  height: 100%;
  max-width: 100%;
`;
