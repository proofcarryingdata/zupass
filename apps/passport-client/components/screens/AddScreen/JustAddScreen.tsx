import { PCDAddRequest } from "@pcd/passport-interface";
import React, { useCallback, useContext } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { useDeserialized } from "../../../src/useDeserialized";

import { Button, H2, Spacer } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { PCDCard } from "../../shared/PCDCard";

export function JustAddScreen({ request }: { request: PCDAddRequest }) {
  const [_, dispatch] = useContext(DispatchContext);

  const onAddClick = useCallback(async () => {
    await dispatch({ type: "add-pcd", pcd: request.pcd });
    window.close();
  }, [dispatch, request.pcd]);

  const { error, pcd } = useDeserialized(request.pcd);

  return (
    <AppContainer bg="gray">
      <Container>
        <Spacer h={16} />
        <AppHeader />
        <Spacer h={16} />
        <H2>{"ADD PCD".toUpperCase()}</H2>
        <Spacer h={16} />
        {pcd && <PCDCard pcd={pcd} expanded={true} />}
        {error && JSON.stringify(error)}
        <Spacer h={16} />
        <Button onClick={onAddClick}>Add</Button>
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  max-width: 100%;
`;
