import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useLoadedIssuedPCDs } from "../../src/appHooks";
import { RippleLoader } from "../core/RippleLoader";

export function LoadingIssuedPCDs() {
  const loadedIssuedPCDs = useLoadedIssuedPCDs();

  if (appConfig.isZuzalu) {
    return null;
  }

  if (loadedIssuedPCDs) {
    return null;
  }

  return (
    <Container>
      <LoaderContainer>
        <RippleLoader />
      </LoaderContainer>
      Loading Issued PCDs
    </Container>
  );
}

const Container = styled.div`
  user-select: none;
  margin: 12px 9px;
  box-sizing: border-box;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
`;

const LoaderContainer = styled.div`
  display: inline-block;
  transform: scale(50%);
`;
