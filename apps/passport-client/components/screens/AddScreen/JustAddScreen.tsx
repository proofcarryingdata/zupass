import { PCDAddRequest } from "@pcd/passport-interface";
import { useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { useDeserialized } from "../../../src/useDeserialized";
import { useIsDownloaded, useIsSynced } from "../../../src/useSyncE2EEStorage";
import { err } from "../../../src/util";

import { Button, H2, Spacer } from "../../core";
import { AddedPCD } from "../../shared/AddedPCD";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { DownloadingPCDs } from "../../shared/DownloadingPCDs";
import { PCDCard } from "../../shared/PCDCard";
import { SyncingPCDs } from "../../shared/SyncingPCDs";

/**
 * Screen that allows the user to respond to a `PCDAddRequest` and add
 * a PCD into their wallet without proving it.
 */
export function JustAddScreen({ request }: { request: PCDAddRequest }) {
  const [_state, dispatch] = useContext(DispatchContext);
  const [added, setAdded] = useState(false);
  const { error, pcd } = useDeserialized(request.pcd);
  const synced = useIsSynced();
  const isDownloaded = useIsDownloaded();

  const onAddClick = useCallback(async () => {
    try {
      await dispatch({ type: "add-pcd", pcd: request.pcd });
      setAdded(true);
    } catch (e) {
      await err(dispatch, "Error Adding PCD", e.message);
    }
  }, [dispatch, request.pcd]);

  let content;

  if (!isDownloaded) {
    return <DownloadingPCDs />;
  } else if (!added) {
    content = (
      <>
        <H2>{"ADD PCD".toUpperCase()}</H2>
        <Spacer h={16} />
        {pcd && <PCDCard pcd={pcd} expanded={true} hideRemoveButton={true} />}
        {error && JSON.stringify(error)}
        <Spacer h={16} />
        <Button onClick={onAddClick}>Add</Button>
      </>
    );
  } else if (!synced) {
    return <SyncingPCDs />;
  } else {
    content = <AddedPCD onCloseClick={() => window.close()} />;
  }

  return (
    <AppContainer bg="gray">
      <Container>
        <Spacer h={16} />
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
