import { ReactElement, useCallback, useState } from "react";
import styled from "styled-components";
import { useBottomModal, useDispatch, useSelf } from "../../../src/appHooks";
import { BottomModal, BottomModalHeader } from "../BottomModal";
import { Button2 } from "../Button";
import { Input2 } from "../Input";
import { NewLoader } from "../NewLoader";
import { Typography } from "../Typography";

export const DeleteAccountModal = (): ReactElement => {
  const state = useBottomModal();
  const self = useSelf();
  const dispatch = useDispatch();
  const [emailToDelete, setEmailToDelete] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const deleteAccount = useCallback(async () => {
    if (loading || !self || emailToDelete !== self.emails[0]) return;

    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await dispatch({ type: "delete-account" });
    } catch (e) {
      setLoading(false);
      setError(
        "An error occurred while deleting your account. Please try again."
      );
    }
  }, [loading, self, emailToDelete, dispatch]);

  const backBtn = (
    <Button2
      onClick={() => {
        dispatch({
          type: "set-bottom-modal",
          modal: { modalType: "settings" }
        });
        setEmailToDelete("");
        setError("");
      }}
      variant="secondary"
    >
      Back
    </Button2>
  );

  const textOrLoader = (text: string): ReactElement => {
    if (loading) return <NewLoader columns={3} rows={2} color="white" />;
    return (
      <Typography color="inherit" fontSize={18} fontWeight={500} family="Rubik">
        {text}
      </Typography>
    );
  };

  return (
    <BottomModal isOpen={state.modalType === "delete-account"}>
      <Container>
        <BottomModalHeader
          title="DELETE ACCOUNT"
          description="Please confirm that you want to delete your account. This action cannot be undone."
        />
        <Input2
          variant="secondary"
          placeholder={self?.emails[0]}
          value={emailToDelete}
          onChange={(e) => {
            setEmailToDelete(e.target.value);
            setError("");
          }}
          error={error}
          autoFocus={true}
        />
        <ButtonsContainer>
          <Button2
            variant="danger"
            onClick={deleteAccount}
            disabled={loading || emailToDelete !== self?.emails[0]}
          >
            {textOrLoader("Delete Account")}
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
