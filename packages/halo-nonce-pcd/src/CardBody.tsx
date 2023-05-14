import { FieldLabel, Separator, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { HaLoNoncePCD } from "./HaLoNoncePCD";

export function HaLoNonceCardBody({ pcd }: { pcd: HaLoNoncePCD }) {
  return (
    <Container>
      <p>Zuzalu Memento</p>

      <Separator />

      <FieldLabel>Nonce</FieldLabel>
      <TextContainer>{pcd.claim.nonce}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Public Key</FieldLabel>
      <TextContainer>{pcd.claim.pubkeyHex}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
