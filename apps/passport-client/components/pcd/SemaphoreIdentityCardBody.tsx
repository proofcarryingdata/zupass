import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import React from "react";
import styled from "styled-components";
import { HiddenText } from "../shared/HiddenDisplay";

export function SemaphoreIdentityCardBody({
  pcd,
}: {
  pcd: SemaphoreIdentityPCD;
}) {
  return (
    <Container>
      <Header>commitment</Header>
      <HiddenText text={pcd.claim.identity.commitment.toString()} />
    </Container>
  );
}

const Header = styled.div`
  font-weight: bold;
`;

const Container = styled.div`
  padding: 0px 16px 16px 16px;
  overflow: hidden;
  width: 100%;
`;
