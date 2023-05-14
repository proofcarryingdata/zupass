import styled from "styled-components";
import { HaLoNoncePCD } from "./HaLoNoncePCD";

export function HaLoNonceCardBody({ pcd }: { pcd: HaLoNoncePCD }) {
  return (
    <Container>
      <img src="https://i.imgur.com/F17hNTO.png" />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
