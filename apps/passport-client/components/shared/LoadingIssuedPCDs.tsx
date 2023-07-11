import { useContext } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { DispatchContext } from "../../src/dispatch";
import { RippleLoader } from "../core/RippleLoader";

export function LoadingIssuedPCDs() {
  const [state] = useContext(DispatchContext);

  if (appConfig.isZuzalu) {
    return null;
  }

  if (state.loadedIssuedPCDs) {
    return null;
  }

  return (
    <Container>
      <LoaderContainer>
        <RippleLoader />
      </LoaderContainer>
      <Label>Loading Issued PCDs</Label>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  margin-top: 16px;
  box-sizing: border-box;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
`;

const Label = styled.div`
  /* flex-grow: 1; */
  /* display: flex;
  justify-content: center;
  align-items: center; */
`;

const LoaderContainer = styled.div`
  display: inline-block;
  transform: scale(50%);
`;
