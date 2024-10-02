import { Property } from "csstype";
import { forwardRef } from "react";
import styled from "styled-components";
import { Typography } from "./Typography";

type CardColor = "purple" | "orange";
const CARD_COLORS: Record<CardColor, Property.Color> = {
  purple: "rgba(154, 74, 201, 1)",
  orange: "rgba(255, 115, 0, 1)"
};

const TicketCardContainer = styled.div<{ $borderColor: Property.Color }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 8px;
  border-radius: 16px;
  border-style: solid;
  border-width: 4px;
  border-color: ${({ $borderColor }): Property.Color => $borderColor};
  background-color: white;
  box-shadow:
    0px 2px 4px -1px rgba(0, 0, 0, 0.06),
    0px 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 345px;
`;

const TicketCardImage = styled.img`
  width: 100%;
  height: 100%;
`;

const TicketCardImageContainer = styled.div`
  position: relative;
  width: 100%;
  min-width: 325px;
  height: 215px;
  border-radius: 8px;
  overflow: hidden;
`;

const TicketCardDetails = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  padding: 8px;
`;

const DateChipContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  position: absolute;
  top: 10px;
  left: 10px;
  border-radius: 200px;
  padding: 4px 10px;
  gap: 10px;
  background-color: black;
`;

interface TicketCardProps {
  title: string;
  address: string;
  ticketCount: number;
  ticketDate: string;
  cardColor: CardColor;
  imgSource?: string;
}
export const TicketCard = forwardRef<HTMLDivElement, TicketCardProps>(
  (
    { imgSource, title, address, ticketCount, cardColor, ticketDate },
    ref
  ): JSX.Element => {
    return (
      <TicketCardContainer ref={ref} $borderColor={CARD_COLORS[cardColor]}>
        <TicketCardImageContainer>
          <DateChipContainer>
            <Typography fontSize={12} fontWeight={800} color="white">
              {ticketDate}
            </Typography>
          </DateChipContainer>
          <TicketCardImage src={imgSource} />
        </TicketCardImageContainer>
        <TicketCardDetails>
          <Typography fontSize={18} fontWeight={800}>
            {title}
          </Typography>
          <Typography
            fontSize={14}
            fontWeight={400}
            color="rgba(124, 139, 180, 1)"
          >
            {`${address} • ${ticketCount} ticket${ticketCount > 1 ? "s" : ""}`}
          </Typography>
        </TicketCardDetails>
      </TicketCardContainer>
    );
  }
);
