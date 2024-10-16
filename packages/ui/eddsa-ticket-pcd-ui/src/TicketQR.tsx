import {
  EdDSATicketPCD,
  getQRCodeColorOverride,
  linkToTicket
} from "@pcd/eddsa-ticket-pcd";
import { QRDisplayWithRegenerateAndStorage } from "@pcd/passport-ui";
import { useCallback } from "react";
import { EdDSATicketPCDCardProps } from "./CardBody";

export function TicketQR({
  pcd,
  idBasedVerifyURL
}: {
  pcd: EdDSATicketPCD;
} & Omit<EdDSATicketPCDCardProps, "onClickAddons">): JSX.Element {
  const generate = useCallback(async () => {
    if (
      [
        "53edb3e7-6733-41e0-a9be-488877c5c572", // eth berlin
        "508313ea-f16b-4729-bdf0-281c64493ca9", //  eth prague
        "5074edf5-f079-4099-b036-22223c0c6995" // devcon 7
      ].includes(pcd.claim.ticket.eventId) &&
      pcd.claim.ticket.ticketSecret
    ) {
      return pcd.claim.ticket.ticketSecret;
    } else {
      return linkToTicket(
        idBasedVerifyURL!,
        pcd.claim.ticket.ticketId,
        pcd.claim.ticket.eventId
      );
    }
  }, [idBasedVerifyURL, pcd]);

  return (
    <QRDisplayWithRegenerateAndStorage
      key={pcd.id}
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={undefined}
      fgColor={getQRCodeColorOverride(pcd)}
    />
  );
}
