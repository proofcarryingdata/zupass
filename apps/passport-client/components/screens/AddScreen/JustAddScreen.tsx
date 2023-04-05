import { PCDAddRequest } from "@pcd/passport-interface";
import React, { useCallback, useContext } from "react";
import { DispatchContext } from "../../../src/dispatch";

import { Button, CenterColumn, H2, Spacer } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";

export function JustAddScreen({ request }: { request: PCDAddRequest }) {
  const [_, dispatch] = useContext(DispatchContext);

  const onAddClick = useCallback(() => {
    dispatch({ type: "add-pcd", pcd: request.pcd });
  }, [dispatch, request.pcd]);

  return (
    <div>
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <H2>{"ADD PCD".toUpperCase()}</H2>
        <CenterColumn w={280}>
          <Button onClick={onAddClick}>Add</Button>
        </CenterColumn>
      </AppContainer>
    </div>
  );
}
