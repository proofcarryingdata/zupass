import { HiddenText, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { SemaphoreSignaturePCD } from "./SemaphoreSignaturePCD";

export function SemaphoreIdentityCardBody({
  pcd,
}: {
  pcd: SemaphoreSignaturePCD;
}) {
  return (
    <Container>
      <span>Commitment</span>
      <HiddenText text={pcd.claim.identityCommitment} />
      <Spacer h={8} />

      <span>Signed Message</span>
      <TextContainer>{pcd.claim.signedMessage}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
