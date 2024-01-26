import styled from "styled-components";
import { useLoadedIssuedPCDs } from "../../src/appHooks";
import { RippleLoader } from "../core/RippleLoader";

export function LoadingIssuedPCDs(): JSX.Element | null {
  const loadedIssuedPCDs = useLoadedIssuedPCDs();

  if (loadedIssuedPCDs) {
    return null;
  }

  return (
    <Container>
      <LoaderContainer>
        <RippleLoader />
      </LoaderContainer>
      Loading Tickets
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
