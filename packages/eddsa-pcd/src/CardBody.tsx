import { FieldLabel, HiddenText, Separator, Spacer } from "@pcd/passport-ui";
import styled from "styled-components";
import { EdDSAPCD } from "./EdDSAPCD";

export function EdDSACardBody({ pcd }: { pcd: EdDSAPCD }) {
  return (
    <Container>
      <p>This PCD represents an EDdSA signature of some bigint values</p>

      <Separator />

      <FieldLabel>Signed Message</FieldLabel>
      <HiddenText
        text={pcd.claim.message.map((num: bigint) => num.toString()).join(",")}
      />
      <Spacer h={8} />

      <FieldLabel>RSA Public Key</FieldLabel>
      <HiddenText text={pcd.claim.publicKey.join("")} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
