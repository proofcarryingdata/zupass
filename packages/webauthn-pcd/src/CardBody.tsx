import {
  FieldLabel,
  Separator,
  Spacer,
  TextContainer,
  styled
} from "@pcd/passport-ui";
import { WebAuthnPCD } from "./WebAuthnPCD";

export function WebAuthnCardBody({ pcd }: { pcd: WebAuthnPCD }) {
  return (
    <Container>
      <p>
        This PCD represents a signature proof in the context of a WebAuthn
        credential. In other words, this is a ZK proof that a particular
        credential keypair signed a particular challenge.
      </p>

      <Separator />

      <FieldLabel>Credential Public Key</FieldLabel>
      <TextContainer>
        {pcd.claim.credentialDetails.credentialPublicKey}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Credential ID</FieldLabel>
      <TextContainer>{pcd.claim.credentialDetails.credentialID}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Challenge</FieldLabel>
      <TextContainer>{pcd.claim.challenge}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Origin</FieldLabel>
      <TextContainer>{pcd.claim.origin}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Relying Party ID</FieldLabel>
      <TextContainer>{pcd.claim.rpID}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
