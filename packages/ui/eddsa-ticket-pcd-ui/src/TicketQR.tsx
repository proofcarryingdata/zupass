import { EdDSATicketPCD, getQRCodeColorOverride } from "@pcd/eddsa-ticket-pcd";
import { QRDisplayWithRegenerateAndStorage } from "@pcd/passport-ui";
import { useCallback } from "react";
import { EdDSATicketPCDCardProps } from "./CardBody";

export function TicketQR({
  pcd
}: {
  pcd: EdDSATicketPCD;
} & Omit<
  EdDSATicketPCDCardProps,
  "onClickAddons" | "defaultImage"
>): JSX.Element {
  const generate = useCallback(async () => {
    return pcd.claim.ticket.ticketSecret || "";
  }, [pcd]);

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
