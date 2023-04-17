import { HiddenText, Separator } from "@pcd/passport-ui";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import styled from "styled-components";

export function SemaphoreIdentityCardBody({
  pcd,
}: {
  pcd: SemaphoreIdentityPCD;
}) {
  return (
    <Container>
      <p>
        This PCD represents a Semaphore Identity. It can be used to sign
        messages on behalf of a particular user, or to prove that a message was
        signed by a member that belongs to a particular Semaphore Group.
      </p>

      <Separator />

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
