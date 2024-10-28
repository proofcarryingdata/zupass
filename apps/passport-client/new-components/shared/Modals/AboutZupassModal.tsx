import styled from "styled-components";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Typography } from "../Typography";

export const AboutZupassModal = (): JSX.Element => {
  const activeBottomModal = useBottomModal();
  const dispatch = useDispatch();

  const modalGoBackBehavior =
    activeBottomModal.modalType === "about" &&
    activeBottomModal.modalGoBackBehavior
      ? activeBottomModal.modalGoBackBehavior
      : "close";

  return (
    <BottomModal isOpen={activeBottomModal.modalType === "about"}>
      <Container>
        <TitleContainer>
          <Typography fontSize={20} fontWeight={800}>
            ABOUT ZUPASS
          </Typography>
          <Typography fontSize={16} fontWeight={400} family="Rubik">
            Zupass is a new application powered by Programmable Cryptography.
            It's a stepping stone towards building the next internet.
          </Typography>
        </TitleContainer>
        <ButtonContainer>
          <Button2
            onClick={() => {
              window.open("https://x.com/zupassproject", "_blank");
            }}
          >
            @ZupassProject
          </Button2>
          <Button2
            variant="secondary"
            onClick={() => {
              if (modalGoBackBehavior === "back") {
                dispatch({
                  type: "set-bottom-modal",
                  modal: { modalType: "settings" }
                });
              } else {
                dispatch({
                  type: "set-bottom-modal",
                  modal: { modalType: "none" }
                });
              }
            }}
          >
            {modalGoBackBehavior === "back" ? "Back" : "Close"}
          </Button2>
        </ButtonContainer>
      </Container>
    </BottomModal>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;
const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`;
const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
`;
