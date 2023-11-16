import {
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  TextContainer,
  styled
} from "@pcd/passport-ui";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect, useState } from "react";
import { EthereumOwnershipPCD } from "./EthereumOwnershipPCD";

export function EthereumOwnershipCardBody({
  pcd
}: {
  pcd: EthereumOwnershipPCD;
}) {
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
        This PCD represents that a particular Semphore Identity owns a
        particular Ethereum Address.
      </p>

      <Separator />

      <FieldLabel>Commitment</FieldLabel>
      <HiddenText text={identityCommitment} />
      <Spacer h={8} />

      <FieldLabel>Ethereum Address</FieldLabel>
      <TextContainer>{pcd.claim.ethereumAddress}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
