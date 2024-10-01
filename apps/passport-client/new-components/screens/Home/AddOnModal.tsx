import React, { ReactElement, useState } from "react";
import { BottomModal } from "../../BottomModal";
import { TicketQRWrapper } from "../../../components/shared/PCDCard";
import styled from "styled-components";
import { Typography } from "../../Typography";
import { Button2 } from "../../shared/Button";
import SwipeableViews from "react-swipeable-views";
import { useBottomModal, useDispatch } from "../../../src/appHooks";

const QRContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  align-items: center;
  border: 1px solid #e5dfdf;
  border-radius: 8px;
`;

type DotsProp = {
  amount: number;
  activeIdx: number;
};
const Dot = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 8px;
  background: var(--core-accent);
  opacity: ${({ active }): number => (active ? 1 : 0.2)};
`;

const DotContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 8px;
`;
const ContentContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  flex-direction: column;
  gap: 12px;
`;
const Dots = ({ amount, activeIdx }: DotsProp): ReactElement => {
  return (
    <DotContainer>
      {[...new Array(amount)].map((_, i) => {
        return <Dot active={i === activeIdx} />;
      })}
    </DotContainer>
  );
};

export const AddOnsModal = (): JSX.Element | null => {
  const activeModal = useBottomModal();
  const dispatch = useDispatch();
  const [activeIdx, setActiveIdx] = useState(0);
  if (activeModal.modalType !== "ticket-add-ons") {
    return null;
  }

  const addOns = activeModal.addOns;
  return (
    <BottomModal isOpen={activeModal.modalType === "ticket-add-ons"}>
      <SwipeableViews
        id="test"
        containerStyle={{ width: "100%", paddingBottom: 12 }}
        slideStyle={{ padding: "0 10px" }}
        resistance={true}
        onChangeIndex={(e) => {
          console.log(e);
          setActiveIdx(e);
        }}
      >
        {addOns.map((addOn) => {
          return (
            <QRContainer>
              <TicketQRWrapper pcd={addOn} />
              <Typography
                color="var(--text-primary)"
                fontSize={16}
                fontWeight={500}
              >
                {addOn.claim.ticket.ticketName}
              </Typography>
            </QRContainer>
          );
        })}
      </SwipeableViews>
      <ContentContainer>
        <Dots amount={addOns.length} activeIdx={activeIdx} />
        <Typography color="var(--text-tertiary)" fontWeight={500} fontSize={14}>
          {addOns.length} redeemable {addOns.length > 1 ? "items" : "item"}
        </Typography>
      </ContentContainer>
      <Button2
        onClick={() => {
          dispatch({
            type: "set-bottom-modal",
            modal: {
              modalType: "none"
            }
          });
        }}
      >
        Close
      </Button2>
    </BottomModal>
  );
};
