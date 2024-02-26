import { PCDAddRequest } from "@pcd/passport-interface";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { useDispatch, useIsSyncSettled } from "../../../src/appHooks";
import { useDeserialized } from "../../../src/useDeserialized";
import { err } from "../../../src/util";
import { Button, H2, Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AddedPCD } from "../../shared/AddedPCD";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { PCDCard } from "../../shared/PCDCard";
import { SyncingPCDs } from "../../shared/SyncingPCDs";

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

  const onAddClick = useCallback(async () => {
    try {
      await dispatch({
        type: "add-pcds",
        pcds: [request.pcd],
        folder: request.folder
      });
      setAdded(true);
    } catch (e) {
      await err(dispatch, "Error Adding PCD", e.message);
    }
  }, [dispatch, request.folder, request.pcd]);

  let content;

  if (!syncSettled) {
    return <SyncingPCDs />;
  } else if (!added) {
    content = (
      <>
        <H2>{"ADD PCD".toUpperCase()}</H2>
        <Spacer h={16} />
        {pcd && <PCDCard pcd={pcd} expanded={true} hideRemoveButton={true} />}
        {request.folder && (
          <div>
            PCD will be added to folder:
            <br /> <strong>{request.folder}</strong>
          </div>
        )}
        {error && JSON.stringify(error)}
        <Spacer h={16} />
        <Button onClick={onAddClick}>Add</Button>
      </>
    );
  } else {
    content = <AddedPCD onCloseClick={(): void => window.close()} />;
  }

  return (
    <>
      <MaybeModal fullScreen isProveOrAddScreen={true} />
      <AppContainer bg="gray">
        <Container>
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
