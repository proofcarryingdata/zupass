import { useCallback, useState } from "react";
import SwipeableViews from "react-swipeable-views";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { TicketQRWrapper } from "../../../components/shared/PCDCard";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import { BottomModal } from "../../shared/BottomModal";
import { Button2 } from "../../shared/Button";
import { Typography } from "../../shared/Typography";
import { useTrackpadSwipe } from "./hooks/useTrackpadSwipe";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/16/solid";

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

const disabledCSS = css`
  cursor: not-allowed;
  opacity: 0.2;
  pointer-events: none;
`;

const AddonCircleButton = styled.button<{
  disabled: boolean;
}>`
  display: flex;
  width: 40px;
  height: 32px;
  justify-content: center;
  align-items: center;
  border-radius: 200px;
  border: 2px solid #fff;
  background: rgba(255, 255, 255, 0.8);

  /* shadow */
  box-shadow:
    0px 1px 3px 0px rgba(0, 0, 0, 0.1),
    0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  ${({ disabled }): FlattenSimpleInterpolation | undefined =>
    disabled ? disabledCSS : undefined}
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
`;
export const AddOnsModal = (): JSX.Element | null => {
  const activeModal = useBottomModal();
  const dispatch = useDispatch();
  const isAddOnsModal = activeModal.modalType === "ticket-add-ons";
  const addOns = isAddOnsModal ? activeModal.addOns : [];
  const [holding, setHolding] = useState(false);
  const { containerRef, activeIdx, setActiveIdx } = useTrackpadSwipe({
    isEnabled: isAddOnsModal,
    itemCount: addOns.length
  });

  const handleCloseModal = useCallback(() => {
    dispatch({
      type: "set-bottom-modal",
      modal: {
        modalType: "none"
      }
    });
  }, [dispatch]);

  if (!isAddOnsModal) {
    return null;
  }

  return (
    <BottomModal
      isOpen={activeModal.modalType === "ticket-add-ons"}
      onClickOutside={handleCloseModal}
    >
      <div
        ref={containerRef}
        onMouseDown={() => {
          setHolding(true);
        }}
        onMouseUp={() => {
          setHolding(false);
        }}
        onMouseLeave={() => {
          setHolding(false);
        }}
        style={{
          cursor: holding ? "grabbing" : "grab"
        }}
      >
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
                  {addOn.claim.ticket.ticketName.toUpperCase()}
                </Typography>
              </QRContainer>
            );
          })}
        </_SwipableViews>
      </div>
      <ButtonsContainer>
        <AddonCircleButton
          disabled={activeIdx === 0}
          onClick={() => {
            setActiveIdx((old) => {
              if (old === 0) return old;
              return old - 1;
            });
          }}
        >
          <ChevronLeftIcon
            width={20}
            height={20}
            color="var(--text-tertiary)"
          />
        </AddonCircleButton>
        <Typography
          fontWeight={500}
          fontSize={14}
          color="var(--text-tertiary)"
          family="Rubik"
        >
          {activeIdx + 1} OF {addOns.length}
        </Typography>
        <AddonCircleButton
          disabled={activeIdx === addOns.length - 1}
          onClick={() => {
            setActiveIdx((old) => {
              if (old === addOns.length - 1) return old;
              return old + 1;
            });
          }}
        >
          <ChevronRightIcon
            width={20}
            height={20}
            color="var(--text-tertiary)"
          />
        </AddonCircleButton>
      </ButtonsContainer>
      <Button2 onClick={handleCloseModal}>Close</Button2>
    </BottomModal>
  );
};
