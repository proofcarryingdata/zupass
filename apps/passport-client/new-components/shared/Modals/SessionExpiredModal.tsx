import { ReactElement, useCallback } from "react";
import styled from "styled-components";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Typography } from "../Typography";
import { useExport } from "../utils";

const optionsList = [
  "Reload this page",
  "Export your account data, log out of this account, and login again."
];
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ListCounter = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #e7eaf2;
  flex-shrink: 0;
`;

const ListItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;
`;

const ListContainer = styled.div`
  display: flex;
  padding: 4px 0px;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;
`;

const TextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
i
`;
export const SessionExpiredModal = (): ReactElement => {
  const activeBottomModal = useBottomModal();
  const exportFn = useExport();
  const dispatch = useDispatch();

  const onLogoutClick = useCallback(() => {
    if (
      !confirm(
        "Are you sure you want to log out? " +
          "We recommend that you export your account before doing so."
      )
    ) {
      return;
    }
    dispatch({ type: "reset-passport" });
  }, [dispatch]);

  return (
    <BottomModal
      isOpen={activeBottomModal.modalType === "invalid-participant"}
      dismissable={false}
    >
      <Container>
        <TitleGroup>
          <Typography fontSize={20} fontWeight={800}>
            SESSION EXPIRED
          </Typography>
          <Typography family="Rubik">
            Your session has expired. This can happen when you reset your
            account on a different device.
          </Typography>
        </TitleGroup>
        <TextGroup>
          <div>
            <Typography family="Rubik">
              To resolve, we recommend you either:
            </Typography>
            <ListContainer>
              {optionsList.map((option, i) => (
                <ListItem key={option}>
                  <ListCounter>
                    <Typography fontWeight={700} fontSize={14}>
                      {i + 1}
                    </Typography>
                  </ListCounter>
                  <Typography family="Rubik">{option}</Typography>
                </ListItem>
              ))}
            </ListContainer>
          </div>

          <Typography family="Rubik">
            If this issue persists, please contact us at support@zupass.org
          </Typography>
        </TextGroup>
        <ButtonsContainer>
          <Button2
            onClick={() => {
              exportFn();
            }}
          >
            Export
          </Button2>
          <Button2 variant="secondary" onClick={onLogoutClick}>
            Logout
          </Button2>
        </ButtonsContainer>
      </Container>
    </BottomModal>
  );
};
