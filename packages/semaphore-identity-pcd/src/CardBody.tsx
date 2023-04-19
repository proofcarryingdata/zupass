import { FieldLabel, HiddenText, Separator } from "@pcd/passport-ui";
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
        This PCD represents a Sempahore Identity, which can be used to send
        anonymous group signals.
      </p>
      <Separator />
      <FieldLabel>Semaphore Commitment</FieldLabel>
      <HiddenText text={pcd.claim.identity.commitment.toString()} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
