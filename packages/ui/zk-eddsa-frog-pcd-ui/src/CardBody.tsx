import {
  FieldLabel,
  Separator,
  Spacer,
  TextContainer,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { ZKEdDSAFrogPCD } from "@pcd/zk-eddsa-frog-pcd";

export const ZkEdDSAFrogPCDUI: PCDUI = {
  renderCardBody: ZKEdDSAFrogCardBody
};

function ZKEdDSAFrogCardBody({ pcd }: { pcd: ZKEdDSAFrogPCD }) {
  return (
    <Container>
      <p>
        This PCD represents an EdDSA signed frog issued to a user's semaphore
        identity, with proven claims about that frog.
      </p>
      <Separator />

      <FieldLabel>Frog ID</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.frogId}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Biome</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.biome}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Rarity</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.rarity}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Temperament</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.temperament}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Jump</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.jump}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Speed</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.speed}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Intelligence</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.intelligence}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Beauty</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.beauty}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Timestamp Signed</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.timestampSigned}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Owner Semaphore Id</FieldLabel>
      <TextContainer>{pcd.claim.partialFrog.ownerSemaphoreId}</TextContainer>
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
