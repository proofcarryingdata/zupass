import {
  PCDGetWithoutProvingRequest,
  PCDRequestType,
} from "@pcd/passport-interface";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { DispatchContext } from "../../src/dispatch";
import { err } from "../../src/util";
import { Button, H1, Spacer } from "../core";
import { AppContainer } from "../shared/AppContainer";
import { AppHeader } from "../shared/AppHeader";

export function GetWithoutProvingScreen() {
  const location = useLocation();
  const [state, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(
    params.get("request")
  ) as PCDGetWithoutProvingRequest;

  if (request.type !== PCDRequestType.GetWithoutProving) {
    err(
      dispatch,
      "Unsupported request",
      `Expected a PCD GetWithoutProving request`
    );
    return null;
  }

  return (
    <AppContainer bg="gray">
      <Container>
        <Spacer h={16} />
        <AppHeader />
        <Spacer h={16} />
        <H1>Get {request.pcdType}</H1>
        <p>
          This website is requesting a pcd of type {request.pcdType} from your
          passport. Choose the one you want to return, and click 'Send' below to
          give it to the website.
        </p>
        <Spacer h={16} />
        <select style={{ width: "100%" }}>
          {state.pcds
            .getAll()
            .filter((pcd) => pcd.type === request.pcdType)
            .map((pcd) => {
              const pcdPackage = state.pcds.getPackage(pcd.type);
              return (
                <option key={pcd.id} value={pcd.id}>
                  {pcdPackage?.getDisplayOptions(pcd)?.displayName ?? pcd.id}
                </option>
              );
            })}
        </select>
        <Spacer h={16} />
        <Button>Send</Button>
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  max-width: 100%;
`;
