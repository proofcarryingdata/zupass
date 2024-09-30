import React from "react";
import { TicketType } from "./types";
import { BottomModal } from "../../BottomModal";
import { useSwipeable } from "react-swipeable";
import { TicketQR } from "@pcd/pod-ticket-pcd-ui";
import { TicketQRWrapper } from "../../../components/shared/PCDCard";
import styled from "styled-components";
import { QR } from "@pcd/passport-ui";
import { Typography } from "../../Typography";
import { Button2 } from "../../shared/Button";
type AddOnModalProp = {
  addOns: TicketType[];
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
};
const Container = styled.div`
  overflow: hidden;
  max-width: 100%;
`;

const InnerContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 0 100%;
`;

const QRContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  align-items: center;
`;
export const AddOnsModal = ({
  addOns,
  isOpen,
  setIsOpen
}: AddOnModalProp): JSX.Element | null => {
  const handlers = useSwipeable({
    onSwipedLeft: () => {},
    onSwipedRight: () => {},
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    trackMouse: true
  });
  return (
    <BottomModal isOpen={isOpen}>
      <Container>
        <InnerContainer>
          {addOns.map((addOn, i) => {
            return (
              <QRContainer>
                <TicketQRWrapper pcd={addOn} />
                <Typography
                  color="var(--text-primary)"
                  fontSize={16}
                  fontWeight={500}
                >
                  {addOn.claim.ticket.ticketName}{" "}
                </Typography>
              </QRContainer>
            );
          })}
        </InnerContainer>
      </Container>
      <Button2 onClick={() => setIsOpen(false)}>Close</Button2>
    </BottomModal>
  );
};
