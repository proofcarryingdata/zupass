import {
  QRDisplayWithRegenerateAndStorage,
  encodeQRPayload,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import {
  RSATicketPCD,
  RSATicketPCDPackage,
  getQRCodeColorOverride,
  getTicketData,
  initArgs
} from "@pcd/rsa-ticket-pcd";
import { useCallback } from "react";

export const RSATicketPCDUI: PCDUI = {
  renderCardBody: RSATicketCardBody
};

function RSATicketCardBody({ pcd }: { pcd: RSATicketPCD }) {
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
    const serialized = await RSATicketPCDPackage.serialize(pcd);
    const serializedPCD = JSON.stringify(serialized);
    const encodedPCD = encodeQRPayload(serializedPCD);
    if (!initArgs.makeEncodedVerifyLink) {
      throw new Error("must provide makeEncodedVerifyLink");
    }
    const verificationLink = initArgs.makeEncodedVerifyLink(encodedPCD);
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
