import { PCDAddRequest } from "@pcd/passport-interface";
import React, { useCallback, useContext } from "react";
import { DispatchContext } from "../../../src/dispatch";
import { useDeserialized } from "../../../src/useDeserialized";

import { Button, CenterColumn, H2, Spacer } from "../../core";
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
    <div>
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <H2>{"ADD PCD".toUpperCase()}</H2>
        <CenterColumn w={280}>
          {pcd && <PCDCard pcd={pcd} expanded={true} />}
          {error && JSON.stringify(error)}
          <Spacer h={8} />
          <Button onClick={onAddClick}>Add</Button>
        </CenterColumn>
      </AppContainer>
    </div>
  );
}
