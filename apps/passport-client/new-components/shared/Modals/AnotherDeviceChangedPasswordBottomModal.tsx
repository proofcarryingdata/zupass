import styled from "styled-components";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Typography } from "../Typography";

export const AnotherDeviceChangedPasswordBottomModal = (): JSX.Element => {
  const activeBottomModal = useBottomModal();
  const dispatch = useDispatch();

  return (
    <BottomModal
      isOpen={activeBottomModal.modalType === "another-device-changed-password"}
      dismissable={false}
    >
      <Container>
        <TitleContainer>
          <Typography fontSize={20} fontWeight={800}>
            Session Invalid
          </Typography>
          <Typography fontSize={16} fontWeight={400} family="Rubik">
            You've changed your password on another device, logging you out of
            all other sessions. Click the button below to log out. Then you'll
            be able to log in with your new password.
          </Typography>
        </TitleContainer>
        <Button2
          onClick={() => {
            dispatch({ type: "reset-passport" });
          }}
        >
          Logout
        </Button2>
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
