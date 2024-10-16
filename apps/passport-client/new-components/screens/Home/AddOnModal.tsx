import { ReactElement } from "react";
import SwipeableViews from "react-swipeable-views";
import styled from "styled-components";
import { TicketQRWrapper } from "../../../components/shared/PCDCard";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import { BottomModal } from "../../shared/BottomModal";
import { Button2 } from "../../shared/Button";
import { Typography } from "../../shared/Typography";
import { useTrackpadSwipe } from "./hooks/useTrackpadSwipe";

// @ts-expect-error TMP fix for bad lib
const _SwipableViews = SwipeableViews.default;

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
  onDotClick: (index: number) => void;
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
const Dots = ({ amount, activeIdx, onDotClick }: DotsProp): ReactElement => {
  return (
    <DotContainer>
      {[...new Array(amount)].map((_, i) => {
        return (
          <Dot key={i} active={i === activeIdx} onClick={() => onDotClick(i)} />
        );
      })}
    </DotContainer>
  );
};

export const AddOnsModal = (): JSX.Element | null => {
  const activeModal = useBottomModal();
  const dispatch = useDispatch();
  const isAddOnsModal = activeModal.modalType === "ticket-add-ons";
  const addOns = isAddOnsModal ? activeModal.addOns : [];

  const { containerRef, activeIdx, setActiveIdx } = useTrackpadSwipe({
    isEnabled: isAddOnsModal,
    itemCount: addOns.length
  });

  const handleDotClick = (index: number): void => {
    setActiveIdx(index);
  };

  if (!isAddOnsModal) {
    return null;
  }

  return (
    <BottomModal isOpen={activeModal.modalType === "ticket-add-ons"}>
      <div ref={containerRef}>
        <_SwipableViews
          containerStyle={{ width: "100%", paddingBottom: 12 }}
          slideStyle={{ padding: "0 10px" }}
          resistance={true}
          index={activeIdx}
          onChangeIndex={setActiveIdx}
          enableMouseEvents
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
        </_SwipableViews>
      </div>
      <ContentContainer>
        <Dots
          amount={addOns.length}
          activeIdx={activeIdx}
          onDotClick={handleDotClick}
        />
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
