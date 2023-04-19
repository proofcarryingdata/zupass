import {
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  TextContainer,
} from "@pcd/passport-ui";
import styled from "styled-components";
import { EthereumOwnershipPCD } from "./EthereumOwnershipPCD";

export function SemaphoreIdentityCardBody({
  pcd,
}: {
  pcd: EthereumOwnershipPCD;
}) {
  return (
    <Container>
      <p>
        This PCD represents that a particular Semphore identity owns a
        particular PCD. particular Semaphore Identity.
      </p>

      <Separator />

      <FieldLabel>Commitment</FieldLabel>
      <HiddenText text={pcd.claim.identityCommitment} />
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
