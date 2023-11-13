import { FieldLabel, Separator, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { ZKEdDSAFrogPCD } from "./ZKEdDSAFrogPCD";

export function ZKEdDSAFrogCardBody({ pcd }: { pcd: ZKEdDSAFrogPCD }) {
  return (
    <Container>
      <p>
        This PCD represents an EdDSA signed frog issued to a user's semaphore
        identity, with proven claims about that frog. Some or all of the fields
        of the frog can be hidden, while still proving the frog is valid.
      </p>

      <Separator />

      <FieldLabel>Frog ID</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.frogId || "HIDDEN"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Biome</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.biome || "HIDDEN"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Rarity</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.rarity || "HIDDEN"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Temperament</FieldLabel>
      <TextContainer>
        {pcd.claim.partialFrog.temperament || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Jump</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.jump || "HIDDEN"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Speed</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.speed || "HIDDEN"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Intelligence</FieldLabel>
      <TextContainer>
        {pcd.claim.partialFrog.intelligence || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Beauty</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.beauty || "HIDDEN"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Timestamp Signed</FieldLabel>
      <TextContainer>
        {pcd.claim.partialFrog.timestampSigned || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Owner Semaphore Id</FieldLabel>
      <TextContainer>
        {pcd.claim.partialFrog.ownerSemaphoreId || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Signer Public Key</FieldLabel>
      <TextContainer>
        {pcd.claim.signerPublicKey[0] + ", " + pcd.claim.signerPublicKey[1]}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>External Nullifier</FieldLabel>
      <TextContainer>{pcd.claim.externalNullifier}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Nullifier Hash</FieldLabel>
      <TextContainer>{pcd.claim.nullifierHash || "HIDDEN"}</TextContainer>
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
