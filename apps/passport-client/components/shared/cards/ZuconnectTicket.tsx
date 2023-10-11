import { EdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
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
  pcd: EdDSATicketPCD;
  publicKeyName: string;
}) {
  return (
    <CardContainerExpanded>
      <CardOutlineExpanded>
        <CardHeader col="var(--accent-lite)">
          <div>VERIFIED ZUCONNECT '23 TICKET</div>
          <div>SIGNED BY: {publicKeyName}</div>
          <div>NAME: {pcd.claim.ticket.attendeeName}</div>
          <ZuzaluRole>TYPE: {pcd.claim.ticket.ticketName}</ZuzaluRole>
        </CardHeader>
      </CardOutlineExpanded>
    </CardContainerExpanded>
  );
}

const ZuzaluRole = styled.div`
  text-transform: uppercase;
`;
