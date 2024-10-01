import styled from "styled-components";
import { useBottomModal, useDispatch, useSelf } from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Input2 } from "../Input";

export const ManageEmailModal = (): JSX.Element => {
  const self = useSelf();
  const dispatch = useDispatch();
  const activeBottomModal = useBottomModal();
  const emails = self?.emails;

  return (
    <BottomModal isOpen={activeBottomModal.modalType === "manage-emails"}>
      <Container>
        <EmailsContainer>
          {emails?.map((email) => <EmailInput email={email} />)}
        </EmailsContainer>
        <ButtonsContainer>
          <Button2 onClick={() => {}}>Add Email</Button2>
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
        </ButtonsContainer>
      </Container>
    </BottomModal>
  );
};

const EmailInput = ({ email }: { email: string }): JSX.Element => {
  return <Input2 placeholder="Email" variant="secondary" value={email} />;
};

const EmailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

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
