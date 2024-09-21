import { Property } from "csstype";
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
`;

const TicketCardImage = styled.img`
  width: 100%;
  min-width: 350px;
  height: 215px;
  border-radius: 8px;
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
  imgSource: string;
  title: string;
  address: string;
  ticketCount: number;
  cardColor: CardColor;
}
export const TicketCard = ({
  imgSource,
  title,
  address,
  ticketCount,
  cardColor
}: TicketCardProps): JSX.Element => {
  return (
    <TicketCardContainer $borderColor={CARD_COLORS[cardColor]}>
      <TicketCardImage src={imgSource} />
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
};
