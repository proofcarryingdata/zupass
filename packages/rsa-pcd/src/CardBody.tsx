import {
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  styled
} from "@pcd/passport-ui";
import { RSAPCD } from "./RSAPCD";

export function RSACardBody({ pcd }: { pcd: RSAPCD }) {
  return (
    <Container>
      <p>This PCD represents an RSA signature of some text</p>

      <Separator />

      <FieldLabel>Signed Message</FieldLabel>
      <HiddenText text={pcd.claim.message} />
      <Spacer h={8} />

      <FieldLabel>RSA Public Key</FieldLabel>
      <HiddenText text={pcd.proof.publicKey} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
