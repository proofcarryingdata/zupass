import { Spacer } from "@pcd/passport-ui";
import styled from "styled-components";
import { useBottomModal, useDispatch, useSelf } from "../../../src/appHooks";
import { Accordion } from "../Accordion";
import { BottomModal, BottomModalHeader } from "../BottomModal";
import { Button2 } from "../Button";

export const HelpModal = (): JSX.Element => {
  const activeBottomModal = useBottomModal();
  const self = useSelf();
  const dispatch = useDispatch();
  return (
    <BottomModal isOpen={activeBottomModal.modalType === "help-modal"}>
      <BottomModalHeader
        title="DON’T SEE YOUR TICKET?"
        description="We don’t see an upcoming event that matches the emails under your account."
      />
      <Spacer h={20} />
      {self && (
        <Accordion
          title="CONNECTED EMAILS"
          link={{
            title: "EDIT",
            onClick: () => {
              dispatch({
                type: "set-bottom-modal",
                modal: { modalType: "manage-emails" }
              });
            }
          }}
          displayOnly={true}
          children={self.emails.map((email) => {
            return {
              title: email,
              key: email
            };
          })}
        />
      )}
      <Spacer h={8} />
      <ButtonsContainer>
        <Button2
          onClick={() => {
            window.open("mailto:support@zupass.org");
          }}
        >
          Contact support
        </Button2>
        <Button2
          variant="secondary"
          onClick={() => {
            dispatch({
              type: "set-bottom-modal",
              modal: { modalType: "none" }
            });
          }}
        >
          Close
        </Button2>
      </ButtonsContainer>
    </BottomModal>
  );
};

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
