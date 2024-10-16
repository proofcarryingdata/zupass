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
    if (pcd.claim.ticket.ticketSecret) {
      return pcd.claim.ticket.ticketSecret;
    } else {
      return linkToTicket(
        idBasedVerifyURL,
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
