import { FieldLabel, Separator, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { ZKEdDSAFrogPCD } from "./ZKEdDSAFrogPCD";

export function ZKEdDSAFrogCardBody({ pcd }: { pcd: ZKEdDSAFrogPCD }) {
  return (
    <Container>
      <p>
        This PCD represents an EdDSA signed frog issued to a user's semaphore
        identity, with proven claims about that frog.
      </p>

      <Separator />

      <FieldLabel>Frog ID</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.frogId}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Biome</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.biome}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Rarity</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.rarity}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Temperament</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.temperament}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Jump</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.jump}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Speed</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.speed}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Intelligence</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.intelligence}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Beauty</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.beauty}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Timestamp Signed</FieldLabel>
      <TextContainer>{pcd.claim.frogOmitOwner.timestampSigned}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>External Nullifier</FieldLabel>
      <TextContainer>{pcd.claim.externalNullifier}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Nullifier Hash</FieldLabel>
      <TextContainer>{pcd.claim.nullifierHash}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Watermark</FieldLabel>
      <TextContainer>{pcd.claim.watermark}</TextContainer>
      <Spacer h={8} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
