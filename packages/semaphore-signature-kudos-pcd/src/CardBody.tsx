import React from "react";
import styled from "styled-components";
import { SemaphoreSignatureKudosPCD } from "./SemaphoreSignatureKudosPCD";

export function SemaphoreSignatureKudosPCDCardBody({
  pcd
}: {
  pcd: SemaphoreSignatureKudosPCD;
}) {
  return (
    <Container>
      <KudosInfo>
        <span>{JSON.stringify(pcd.claim.data)}</span>
      </KudosInfo>
    </Container>
  );
}

const Container = styled.span`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

const KudosInfo = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;
