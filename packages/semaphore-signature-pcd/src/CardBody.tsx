import {
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  TextContainer,
  styled
} from "@pcd/passport-ui";
import { SemaphoreSignaturePCD } from "./SemaphoreSignaturePCD";

export function SemaphoreIdentityCardBody({
  pcd
}: {
  pcd: SemaphoreSignaturePCD;
}) {
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
