import { Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { SemaphoreGroupPCD } from "./SemaphoreGroupPCD";

export function SemaphoreGroupCardBody({ pcd }: { pcd: SemaphoreGroupPCD }) {
  return (
    <Container>
      <span>Group Root</span>
      <TextContainer>{pcd.claim.merkleRoot}</TextContainer>
      <Spacer h={8} />

      <span>Signal</span>
      <TextContainer>{pcd.claim.signal}</TextContainer>
      <Spacer h={8} />

      <span>Nullifier Hash</span>
      <TextContainer>{pcd.claim.nullifierHash}</TextContainer>
      <Spacer h={8} />

      <span>External Nullifier</span>
      <TextContainer>{pcd.claim.externalNullifier}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
