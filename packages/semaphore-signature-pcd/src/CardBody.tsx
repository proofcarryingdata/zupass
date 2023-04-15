import { HiddenText, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { SemaphoreSignaturePCD } from "./SemaphoreSignaturePCD";

export function SemaphoreIdentityCardBody({
  pcd,
}: {
  pcd: SemaphoreSignaturePCD;
}) {
  return (
    <Container>
      <HiddenText text={pcd.claim.identityCommitment} label="commitment" />
      <span>signed message</span>
      <TextContainer>{pcd.claim.signedMessage}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 0px 16px 16px 16px;
  overflow: hidden;
  width: 100%;
`;
