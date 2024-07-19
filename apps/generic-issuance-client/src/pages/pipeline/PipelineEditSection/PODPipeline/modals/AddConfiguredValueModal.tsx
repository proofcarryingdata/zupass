import {
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from "@chakra-ui/react";
import { ReactNode, useCallback, useState } from "react";

export function AddConfiguredValueModal({
  isOpen,
  onCancel,
  onSubmit
}: {
  isOpen: boolean;
  onCancel: () => void;
  onSubmit: (value: string) => Promise<void>;
}): ReactNode {
  const [value, setValue] = useState<string>("");
  const [inProgress, setInProgress] = useState<boolean>(false);

  const triggerClose = useCallback(() => {
    onCancel();
    setValue("");
  }, [onCancel]);

  const submit = useCallback(async () => {
    setInProgress(true);
    await onSubmit(value);
    setValue("");
    setInProgress(false);
  }, [onSubmit, value]);

  return (
    <Modal
      onClose={triggerClose}
      isOpen={isOpen}
      isCentered
      motionPreset="slideInBottom"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Configured Value</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={2}>
            <FormLabel>Configured Value</FormLabel>
            <Input
              autoFocus={true}
              value={value}
              onChange={(e): void => setValue(e.target.value)}
              placeholder="Enter value"
              type="text"
              width="sm"
              maxW={"100%"}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <ButtonGroup>
            <Button
              onClick={submit}
              colorScheme="blue"
              isDisabled={inProgress || value.length === 0}
            >
              Add
            </Button>
            <Button onClick={triggerClose}>Cancel</Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
