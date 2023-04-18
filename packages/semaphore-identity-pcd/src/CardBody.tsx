import { FieldLabel, HiddenText, Separator, Spacer } from "@pcd/passport-ui";
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
        This PCD proves that your Semaphore Identity is the owner of the given
        Ethereum address.
      </p>

      <Separator />

      <FieldLabel>Semaphore Commitment</FieldLabel>
      <HiddenText text={pcd.claim.identity.commitment.toString()} />
      <Spacer h={8} />
      <FieldLabel>Ethereum Address</FieldLabel>
      <HiddenText text={"0x1CCc038c4ec3169B6e6bB3C286080913684757EF"} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
