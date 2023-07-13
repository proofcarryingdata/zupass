import {
  encodeQRPayload,
  QRDisplayWithRegenerateAndStorage,
} from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { RSATicketPCD, RSATicketPCDPackage } from "./RSATicketPCD";

export function RSATicketCardBody({ pcd }: { pcd: RSATicketPCD }) {
  return (
    <Container>
      <TicketQR pcd={pcd} />
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
    return encodedPCD;
  }, [pcd]);

  return (
    <QRDisplayWithRegenerateAndStorage
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={"TICKET"}
    />
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
