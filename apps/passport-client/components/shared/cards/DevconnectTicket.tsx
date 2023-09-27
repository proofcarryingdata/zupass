import { EdDSATicketPCD, getQRCodeColorOverride } from "@pcd/eddsa-ticket-pcd";
import { QRDisplayWithRegenerateAndStorage } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";

function makeEncodedVerifyLink(ticketId: string): string {
  const link = `${
    window.location.origin
  }/#/checkin-by-id?id=${encodeURIComponent(ticketId)}`;
  return link;
}

function TicketQR({ pcd }: { pcd: EdDSATicketPCD }) {
  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
    const ticketId = pcd.claim.ticket.ticketId;
    const verificationLink = makeEncodedVerifyLink(ticketId);
    return verificationLink;
  }, [pcd]);

  return (
    <QRDisplayWithRegenerateAndStorage
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={pcd.id}
      fgColor={getQRCodeColorOverride(pcd)}
    />
  );
}

export function DevconnectCardBody({ pcd }: { pcd: EdDSATicketPCD }) {
  const ticketData = pcd.claim.ticket;
  return (
    <Container>
      <TicketInfo>
        <TicketQR pcd={pcd} />
        <span>{ticketData?.attendeeName}</span>
        <span>{ticketData?.attendeeEmail}</span>
      </TicketInfo>
    </Container>
  );
}

const Container = styled.span`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

const TicketInfo = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;
