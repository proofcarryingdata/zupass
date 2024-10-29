import { Property } from "csstype";
import { forwardRef } from "react";
import styled from "styled-components";
import { Typography } from "./Typography";

export const TicketCardHeight = 300;

type CardColor = "purple" | "orange";
const CARD_COLORS: Record<CardColor, Property.Color> = {
  purple: "rgba(154, 74, 201, 1)",
  orange: "rgba(255, 115, 0, 1)"
};

const TicketCardContainer = styled.div<{
  $borderColor: Property.Color;
  $width: number | string;
}>`
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
  width: ${({ $width }): string =>
    typeof $width === "number" ? `${$width}px` : $width};
  height: ${TicketCardHeight}px;
  box-shadow:
    0px 2px 4px -1px rgba(0, 0, 0, 0.06),
    0px 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const TicketCardImage = styled.div<{ src?: string }>`
  ${({ src }): string | undefined =>
    src ? `background: url(${src});` : undefined}
  background-size: cover;
  background-position: 50% 50%;
  width: 100%;
  height: 100%;
`;

const TicketCardImageContainer = styled.div`
  position: relative;
  width: 100%;
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

interface TicketCardProps {
  title: string;
  address?: string;
  ticketWidth?: number | string;
  ticketCount: number;
  cardColor: CardColor;
  imgSource?: string;
}
export const TicketCard = forwardRef<HTMLDivElement, TicketCardProps>(
  (
    { imgSource, title, address, ticketCount, cardColor, ticketWidth },
    ref
  ): JSX.Element => {
    return (
      <TicketCardContainer
        $width={ticketWidth || 300}
        ref={ref}
        $borderColor={CARD_COLORS[cardColor]}
      >
        <TicketCardImageContainer>
          <TicketCardImage src={imgSource} />
        </TicketCardImageContainer>
        <TicketCardDetails>
          <Typography fontSize={18} fontWeight={800}>
            {title.toUpperCase()}
          </Typography>
          <Typography
            fontSize={14}
            fontWeight={400}
            color="rgba(124, 139, 180, 1)"
            family="Rubik"
          >
            {`${address ? `${address} • ` : ""}${ticketCount} ticket${
              ticketCount > 1 ? "s" : ""
            }`}
          </Typography>
        </TicketCardDetails>
      </TicketCardContainer>
    );
  }
);
