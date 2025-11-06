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
  if (!self) {
    return <></>;
  }

  return (
    <BottomModal isOpen={activeBottomModal.modalType === "help-modal"}>
      <BottomModalHeader
        title="DON’T SEE YOUR TICKET?"
        description="We don’t see an event that matches the emails under your account."
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
                modal: {
                  modalType: "manage-emails",
                  prevModal: { modalType: "help-modal" }
                }
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
        <Description>
          Make sure the email above matches the one you used to purchase your
          ticket. If it does not, you can either add that email to your existing
          Zupass account, or ask the event organizing team to update the ticket
          with the new email.
        </Description>

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

const Description = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 16px;
  margin-top: 16px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
