import { Spacer, TextContainer } from "@pcd/passport-ui";
import { useMemo } from "react";
import styled from "styled-components";
import { SemaphoreGroupPCD } from "./SemaphoreGroupPCD";
import { deserializeSemaphoreGroup } from "./SerializedSemaphoreGroup";

export function SemaphoreGroupCardBody({ pcd }: { pcd: SemaphoreGroupPCD }) {
  const groupRoot = useMemo(() => {
    return deserializeSemaphoreGroup(pcd.claim.group).root.toString();
  }, [pcd]);

  return (
    <Container>
      <span>Group Root</span>
      <TextContainer>{groupRoot}</TextContainer>
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
