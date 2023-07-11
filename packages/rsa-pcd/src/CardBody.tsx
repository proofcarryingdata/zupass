import {
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  TextContainer,
} from "@pcd/passport-ui";
import styled from "styled-components";
import { RSAPCD } from "./RSAPCD";

export function RSACardBody({ pcd }: { pcd: RSAPCD }) {
  return (
    <Container>
      <p>
        This PCD represents a particular message that has been signed by a
        particular Semaphore Identity.
      </p>

      <Separator />

      <FieldLabel>Commitment</FieldLabel>
      <HiddenText text={pcd.claim.publicKey} />
      <Spacer h={8} />

      <FieldLabel>Signed Message</FieldLabel>
      <TextContainer>{pcd.claim.message}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
