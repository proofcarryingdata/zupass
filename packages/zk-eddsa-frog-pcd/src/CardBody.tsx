import { FieldLabel, Separator, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { ZKEdDSAFrogPCD } from "./ZKEdDSAFrogPCD";

export function ZKEdDSAFrogCardBody({
  pcd
}: {
  pcd: ZKEdDSAFrogPCD;
}) {
  return (
    <Container>
      <p>
        This PCD represents an EdDSA signed frog issued to a user's semaphore
        idenity, with proven claims about that frog.
      </p>

      <Separator />

      <FieldLabel>External Nullifier</FieldLabel>
      <TextContainer>{pcd.claim.externalNullifier || "NONE"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Nullifier Hash</FieldLabel>
      <TextContainer>{pcd.claim.nullifierHash || "HIDDEN"}</TextContainer>
      <Spacer h={8} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
