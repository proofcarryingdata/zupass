import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  TicketCategory,
  getEdDSATicketData,
  getQRCodeColorOverride,
  initArgs
} from "@pcd/eddsa-ticket-pcd";
import {
  QRDisplayWithRegenerateAndStorage,
  css,
  encodeQRPayload,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { useCallback } from "react";

export const EdDSATicketPCDUI: PCDUI = {
  renderCardBody: EdDSATicketPCDCardBody
};

function EdDSATicketPCDCardBody({ pcd }: { pcd: EdDSATicketPCD }) {
  const ticketData = getEdDSATicketData(pcd);
  const showImage =
    ticketData?.ticketCategory === TicketCategory.Generic ||
    ticketData?.ticketCategory === TicketCategory.Zuzalu;

  return (
    <Container padding={!showImage}>
      {showImage && <TicketImage pcd={pcd} />}
      {!showImage && <TicketQR pcd={pcd} />}
      <TicketInfo>
        <span>{ticketData?.attendeeName}</span>
        <span>{ticketData?.attendeeEmail}</span>
      </TicketInfo>
    </Container>
  );
}

function TicketImage({ pcd }: { pcd: EdDSATicketPCD }) {
  const { imageUrl, imageAltText } = pcd.claim.ticket;
  return <img src={imageUrl} alt={imageAltText} />;
}

function TicketQR({ pcd }: { pcd: EdDSATicketPCD }) {
  const generate = useCallback(async () => {
    const serialized = await EdDSATicketPCDPackage.serialize(pcd);
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

const Container = styled.span<{ padding: boolean }>`
  ${({ padding }) =>
    padding
      ? css`
          padding: 16px;
        `
      : css``}
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
