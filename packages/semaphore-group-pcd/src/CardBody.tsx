import { HiddenText, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { SemaphoreGroupPCD } from "./SemaphoreGroupPCD";

export function SemaphoreGroupCardBody({ pcd }: { pcd: SemaphoreGroupPCD }) {
  return (
    <Container>
      <HiddenText text={pcd.claim.nullifierHash} label="commitment" />
      <span>Nullifier Hash</span>
      <TextContainer>{pcd.claim.nullifierHash}</TextContainer>
      <span>Signal</span>
      <TextContainer>{pcd.claim.signal}</TextContainer>
      <span>External Nullifier</span>
      <TextContainer>{pcd.claim.externalNullifier}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 0px 16px 16px 16px;
  overflow: hidden;
  width: 100%;
`;
