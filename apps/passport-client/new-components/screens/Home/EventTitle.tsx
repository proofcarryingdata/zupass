import { ReactElement } from "react";
import { TicketPack } from "./types";
import styled from "styled-components";
import { Typography } from "../../shared/Typography";
import { ITicketData } from "@pcd/eddsa-ticket-pcd";

type EventTitleProps = {
  packs: TicketPack[];
};
const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const getEventDetails = (tickets: TicketPack): ITicketData => {
  return tickets.eventTicket.claim.ticket as ITicketData;
};

export const EventTitle = ({ packs }: EventTitleProps): ReactElement => {
  const eventDetails = getEventDetails(packs[0]);
  const { eventName, eventLocation } = eventDetails;
  const ticketCount = packs.length;
  return (
    <TitleContainer>
      <Typography fontSize={28} fontWeight={800} color="var(--text-white)">
        {eventName.toUpperCase()}
      </Typography>
      <Typography fontSize={16} fontWeight={400} color="#B1C6FF">
        {`${eventLocation ? `${eventLocation} • ` : ""}${ticketCount} ticket${
          ticketCount > 1 ? "s" : ""
        }`}
      </Typography>
    </TitleContainer>
  );
};
