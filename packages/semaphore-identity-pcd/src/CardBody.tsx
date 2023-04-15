import { HiddenText } from "@pcd/passport-ui";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import styled from "styled-components";

export function SemaphoreIdentityCardBody({
  pcd,
}: {
  pcd: SemaphoreIdentityPCD;
}) {
  return (
    <Container>
      <span>Commitment</span>
      <HiddenText text={pcd.claim.identity.commitment.toString()} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
