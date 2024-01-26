import { FieldLabel, HiddenText, Separator, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

export const SemaphoreIdentityPCDUI: PCDUI<SemaphoreIdentityPCD> = {
  renderCardBody: SemaphoreIdentityCardBody
};

function SemaphoreIdentityCardBody({
  pcd
}: {
  pcd: SemaphoreIdentityPCD;
}): JSX.Element {
  return (
    <Container>
      <p>
        This PCD represents a Sempahore Identity, which can be used to send
        anonymous group signals, log into websites, etc.
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
