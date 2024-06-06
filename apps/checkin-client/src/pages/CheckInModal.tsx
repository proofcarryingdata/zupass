import {
  Button,
  ButtonGroup,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from "@chakra-ui/react";
import { PipelineCheckinSummary } from "@pcd/passport-interface";
import { ReactNode, useCallback } from "react";

export function CheckInModal({
  checkingIn,
  setCheckingIn,
  data
}: {
  checkingIn: string | undefined;
  setCheckingIn: (ticketId: string | undefined) => void;
  data: PipelineCheckinSummary[];
}): ReactNode {
  const onClose = useCallback(() => setCheckingIn(undefined), [setCheckingIn]);
  const ticket = data.find((checkIn) => checkIn.ticketId === checkingIn);

  return (
    <Modal
      onClose={onClose}
      isOpen={!!checkingIn && !!ticket}
      isCentered
      motionPreset="slideInBottom"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Check In</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <div>
            <strong>Email:</strong> {ticket?.email}
          </div>
          <div>
            <strong>Ticket:</strong> {ticket?.ticketName}
          </div>
        </ModalBody>
        <ModalFooter>
          <ButtonGroup>
            <Button colorScheme="green">Check In</Button>
            <Button onClick={onClose}>Cancel</Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
