import { PCDAddRequest, PCDRequestType } from "@pcd/passport-interface";
import React, { useCallback, useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { err } from "../../src/util";
import { Button, CenterColumn, H2, Spacer } from "../core";
import { AppContainer } from "../shared/AppContainer";
import { AppHeader } from "../shared/AppHeader";

export function AddScreen() {
  const location = useLocation();
  const [_, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request")) as PCDAddRequest;

  const onAddClick = useCallback(async () => {
    await dispatch({ type: "add-pcd", pcd: request.pcd });
    window.location.href = "/#/";
  }, [dispatch, request.pcd]);

  if (request.type !== PCDRequestType.Add) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  return (
    <AppContainer bg="gray">
      <Spacer h={24} />
      <AppHeader />
      <Spacer h={24} />
      <H2>{"ADD A PCD".toUpperCase()}</H2>
      {/* {JSON.stringify(request)} */}
      <CenterColumn w={280}>
        <Button onClick={onAddClick}>Add</Button>
      </CenterColumn>
    </AppContainer>
  );
}
