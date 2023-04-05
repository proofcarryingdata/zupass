import { PCDAddRequest } from "@pcd/passport-interface";
import React, { useCallback } from "react";
import { Button, CenterColumn, H2, Spacer } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";

export function JustAddScreen({ request }: { request: PCDAddRequest }) {
  const onAddClick = useCallback(() => {
    console.log("add clicked");
  }, []);

  return (
    <div>
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <H2>{"ADD A PCD".toUpperCase()}</H2>
        just add screen <br />
        {JSON.stringify(request)}
        <CenterColumn w={280}>
          <Button onClick={onAddClick}>Add</Button>
        </CenterColumn>
      </AppContainer>
    </div>
  );
}
