import { ReactElement, useCallback } from "react";
import { BottomModal } from "../BottomModal";
import { useBottomModal, useDispatch, useSelf } from "../../../src/appHooks";
import styled from "styled-components";
import { Button2 } from "../Button";
import { Typography } from "../Typography";
import { Input2 } from "../Input";

export const DeleteAccountModal = (): ReactElement => {
  const state = useBottomModal();
  const self = useSelf();
  const dispatch = useDispatch();

  const deleteAccount = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      dispatch({ type: "delete-account" });
    }
  }, [dispatch]);

  const backBtn = (
    <Button2
      onClick={() => {
        dispatch({
          type: "set-bottom-modal",
          modal: { modalType: "settings" }
        });
      }}
      variant="secondary"
    >
      Back
    </Button2>
  );
  return (
    <BottomModal isOpen={state.modalType === "delete-account"}>
      <Container>
        <TextBlock>
          <Typography
            fontWeight={800}
            fontSize={20}
            color="var(--text-primary)"
          >
            DELETE ACCOUNT
          </Typography>
          <Typography fontSize={16} color="var(--text-primary)">
            Please confirm that you want to delete your account.
          </Typography>
        </TextBlock>
        <Input2 disabled value={self?.emails[0]} />
        <ButtonsContainer>
          <Button2
            onClick={() => {
              deleteAccount();
            }}
          >
            Delete
          </Button2>
          {backBtn}
        </ButtonsContainer>
      </Container>
    </BottomModal>
  );
};

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const TextBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
`;
