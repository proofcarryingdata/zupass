import {
  encodeQRPayload,
  QRDisplayWithRegenerateAndStorage,
} from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { initArgs, RSATicketPCD, RSATicketPCDPackage } from "./RSATicketPCD";
import { getTicketData } from "./utils";

export function RSATicketCardBody({ pcd }: { pcd: RSATicketPCD }) {
  const ticketData = getTicketData(pcd);

  return (
    <Container>
      <TicketQR pcd={pcd} />

      <TicketInfo>
        <span>{ticketData.attendeeName}</span>
        <span>{ticketData.attendeeEmail}</span>
      </TicketInfo>
    </Container>
  );
}

function TicketQR({ pcd }: { pcd: RSATicketPCD }) {
  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
    const serialized = await RSATicketPCDPackage.serialize(pcd);
    const serializedPCD = JSON.stringify(serialized);
    console.log(`[QR] generated proof, length ${serializedPCD.length}`);
    const encodedPCD = encodeQRPayload(serializedPCD);
    const verificationLink = initArgs.makeEncodedVerifyLink(encodedPCD);
    return verificationLink;
  }, [pcd]);

  return (
    <QRDisplayWithRegenerateAndStorage
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={pcd.id}
    />
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
