import { FieldLabel, Separator, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { ZKEdDSAEventTicketPCD } from "./ZKEdDSAEventTicketPCD";

export function ZKEdDSAEventTicketCardBody({
  pcd
}: {
  pcd: ZKEdDSAEventTicketPCD;
}) {
  return (
    <Container>
      <p>
        This PCD represents a response to a request for information about a
        signed EdDSA ticket PCD that has been issued for a semaphore keypair
        that the user possesses.
      </p>

      <Separator />

      <FieldLabel>Ticket ID</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.ticketId || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Event ID</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.eventId || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Valid Event IDs</FieldLabel>
      <TextContainer>{pcd.claim.validEventIds || "UNCHECKED"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Product ID</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.productId || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Timestamp Consumed</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.timestampConsumed || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Timestamp Signed</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.timestampSigned || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Semaphore Public ID</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.attendeeSemaphoreId || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Consumed?</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.isConsumed || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Revoked?</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.isRevoked || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Watermark</FieldLabel>
      <TextContainer>{pcd.claim.watermark}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>External Nullifier</FieldLabel>
      <TextContainer>{pcd.claim.externalNullifier || "NONE"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Nullifier Hash</FieldLabel>
      <TextContainer>{pcd.claim.externalNullifier || "HIDDEN"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Ticket Signer</FieldLabel>
      <TextContainer>
        {pcd.claim.signer[0] + ", " + pcd.claim.signer[1]}
      </TextContainer>
      <Spacer h={8} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
