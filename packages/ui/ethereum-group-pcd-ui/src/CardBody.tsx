import { EthereumGroupPCD } from "@pcd/ethereum-group-pcd";
import {
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  TextContainer,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect, useState } from "react";

export const EthereumGroupPCDUI: PCDUI<EthereumGroupPCD> = {
  renderCardBody: EthereumGroupCardBody
};

export function EthereumGroupCardBody({ pcd }: { pcd: EthereumGroupPCD }) {
  const [identityCommitment, setIdentityCommitment] =
    useState("<deserializing>");

  useEffect(() => {
    SemaphoreSignaturePCDPackage.deserialize(pcd.proof.signatureProof.pcd).then(
      (pcd) => {
        setIdentityCommitment(pcd.claim.identityCommitment);
      }
    );
  }, [pcd]);

  return (
    <Container>
      <p>
        This PCD represents that a particular Semphore Identity owns an Ethereum
        Address that is part of a merkle group of Ethereum public keys or
        addresses.
      </p>

      <Separator />

      <FieldLabel>Commitment</FieldLabel>
      <HiddenText text={identityCommitment} />
      <Spacer h={8} />

      <FieldLabel>Merkle Root</FieldLabel>
      <TextContainer>
        {pcd.claim.publicInput.circuitPubInput.merkleRoot.toString(16)}
      </TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
