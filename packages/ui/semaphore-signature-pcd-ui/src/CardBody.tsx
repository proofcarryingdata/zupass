import {
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  TextContainer,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";

export const SemaphoreSignaturePCDUI: PCDUI = {
  renderCardBody: SemaphoreSignatureCardBody
};

function SemaphoreSignatureCardBody({ pcd }: { pcd: SemaphoreSignaturePCD }) {
  return (
    <Container>
      <p>
        This PCD represents a particular message that has been signed by a
        particular Semaphore Identity.
      </p>

      <Separator />

      <FieldLabel>Commitment</FieldLabel>
      <HiddenText text={pcd.claim.identityCommitment} />
      <Spacer h={8} />

      <FieldLabel>Signed Message</FieldLabel>
      <TextContainer>{pcd.claim.signedMessage}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
