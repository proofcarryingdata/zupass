import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import * as React from "react";
import { useCallback, useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { DispatchContext, Dispatcher } from "../../src/dispatch";
import { Button, H1, Spacer } from "../core";

import { title } from "process";
import { AppHeader } from "../shared/AppHeader";
import { PCDArgs } from "../shared/PCDArgs";

export function ProveScreen() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [state, dispatch] = useContext(DispatchContext);
  const request = JSON.parse(params.get("request")) as PCDGetRequest;
  const [args, setArgs] = useState(JSON.parse(JSON.stringify(request.args)));
  const pcdPackage = state.pcds.getPackage(request.pcdType);
  const onProveClick = useCallback(async () => {
    const proof = await pcdPackage.prove(args);
    console.log(proof);
  }, [args]);

  if (request.type !== PCDRequestType.Get) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  return (
    <ProveWrap>
      <Spacer h={24} />
      <AppHeader />
      <Spacer h={24} />
      <H1>🔑 &nbsp; {title}</H1>
      <Spacer h={24} />
      {request.pcdType}
      <pre>{JSON.stringify(args, null, 2)}</pre>
      <PCDArgs args={args} setArgs={setArgs} pcdCollection={state.pcds} />
      <Spacer h={16} />
      <Button onClick={onProveClick}>PROVE</Button>
      <Spacer h={64} />
    </ProveWrap>
  );
}

function err(dispatch: Dispatcher, title: string, message: string) {
  dispatch({
    type: "error",
    error: { title, message },
  });
}

const ProveWrap = styled.div`
  width: 100%;
`;
