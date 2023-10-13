import { EdDSATicketPCD, isEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { ZUCONNECT_PRODUCT_ID_MAPPINGS } from "@pcd/passport-interface";
import { ZKEdDSAEventTicketPCD } from "@pcd/zk-eddsa-event-ticket-pcd";
import styled from "styled-components";
import {
  CardContainerExpanded,
  CardHeader,
  CardOutlineExpanded
} from "../PCDCard";

export function ZuconnectKnownTicketDetails({
  pcd,
  publicKeyName
}: {
  pcd: EdDSATicketPCD | ZKEdDSAEventTicketPCD;
  publicKeyName: string;
}) {
  const productId = isEdDSATicketPCD(pcd)
    ? pcd.claim.ticket.productId
    : pcd.claim.partialTicket.productId;
  const type = Object.entries(ZUCONNECT_PRODUCT_ID_MAPPINGS).find(
    ([_name, product]) => product.id === productId
  )[0];
  return (
    <CardContainerExpanded>
      <CardOutlineExpanded>
        <CardHeader col="var(--accent-lite)">
          <div>VERIFIED ZUCONNECT '23 TICKET</div>
          <div>SIGNED BY: {publicKeyName}</div>
          <ZuzaluRole>TYPE: {type}</ZuzaluRole>
        </CardHeader>
      </CardOutlineExpanded>
    </CardContainerExpanded>
  );
}

const ZuzaluRole = styled.div`
  text-transform: uppercase;
`;
