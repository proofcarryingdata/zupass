import { PCDAddRequest } from "@pcd/passport-interface";
import React, { useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { useDeserialized } from "../../../src/useDeserialized";
import { err } from "../../../src/util";

import { Button, H2, Spacer } from "../../core";
import { AddedPCD } from "../../shared/AddedPCD";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { PCDCard } from "../../shared/PCDCard";

export function JustAddScreen({ request }: { request: PCDAddRequest }) {
  const [_, dispatch] = useContext(DispatchContext);
  const [added, setAdded] = useState(false);
  const { error, pcd } = useDeserialized(request.pcd);

  const onAddClick = useCallback(async () => {
    try {
      await dispatch({ type: "add-pcd", pcd: request.pcd });
      setAdded(true);
    } catch (e) {
      await err(dispatch, "Error Adding PCD", e.message);
    }
  }, [dispatch, request.pcd]);

  let content;

  if (!added) {
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
  } else {
    content = <AddedPCD />;
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
