import {
  FieldLabel,
  Separator,
  Spacer,
  TextContainer,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { ZKEdDSAEventTicketPCD } from "@pcd/zk-eddsa-event-ticket-pcd";

export const ZKEdDSAEventTicketPCDUI: PCDUI<ZKEdDSAEventTicketPCD, unknown> = {
  renderCardBody: ZKEdDSAEventTicketCardBody
};

function ZKEdDSAEventTicketCardBody({ pcd }: { pcd: ZKEdDSAEventTicketPCD }) {
  return (
    <Container>
      <p>
        This PCD represents an EdDSA signed ticket issued to a user's semaphore
        idenity, with proven claims about that ticket. Some or all of the fields
        of the ticket can be hidden, while still proving the ticket is valid,
        and corresponds to one of a list of valid events.
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

      <FieldLabel>Attendee Email</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.attendeeEmail || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Attendee Name</FieldLabel>
      <TextContainer>
        {pcd.claim.partialTicket.attendeeName || "HIDDEN"}
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Watermark</FieldLabel>
      <TextContainer>{pcd.claim.watermark}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>External Nullifier</FieldLabel>
      <TextContainer>{pcd.claim.externalNullifier || "NONE"}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Nullifier Hash</FieldLabel>
      <TextContainer>{pcd.claim.nullifierHash || "HIDDEN"}</TextContainer>
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
