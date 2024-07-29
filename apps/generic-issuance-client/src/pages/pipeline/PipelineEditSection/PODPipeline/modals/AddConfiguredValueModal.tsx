import {
  Button,
  ButtonGroup,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select
} from "@chakra-ui/react";
import { PODPipelineSupportedPODValueTypes } from "@pcd/passport-interface";
import { coercions } from "@pcd/podbox-shared";
import { ReactNode, useCallback, useMemo, useState } from "react";

export function AddConfiguredValueModal({
  isOpen,
  onCancel,
  onSubmit
}: {
  isOpen: boolean;
  onCancel: () => void;
  onSubmit: (value: string, type: string) => Promise<void>;
}): ReactNode {
  const [value, setValue] = useState<string>("");
  const [inProgress, setInProgress] = useState<boolean>(false);
  const [type, setType] = useState<"string" | "int" | "cryptographic">(
    "string"
  );

  const triggerClose = useCallback(() => {
    onCancel();
    setValue("");
  }, [onCancel]);

  const submit = useCallback(async () => {
    setInProgress(true);
    await onSubmit(value, type);
    setValue("");
    setInProgress(false);
  }, [onSubmit, type, value]);

  const isValid = useMemo(() => {
    if (type === "string") {
      return coercions.string(value).success;
    } else if (type === "int") {
      return coercions.int(value).success;
    } else if (type === "cryptographic") {
      return coercions.cryptographic(value).success;
    }
    return false;
  }, [type, value]);

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
          <FormControl isInvalid={!isValid} mb={2}>
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
            {!isValid && (
              <FormErrorMessage>
                Invalid value for type "{type}". Either change the value or
                select a different type.
              </FormErrorMessage>
            )}
          </FormControl>
          <FormControl mb={2}>
            <FormLabel>Type</FormLabel>
            <Select
              value={type}
              onChange={(e): void =>
                setType(e.target.value as PODPipelineSupportedPODValueTypes)
              }
            >
              <option value="string">String</option>
              <option value="int">Integer</option>
              <option value="cryptographic">Cryptographic</option>
            </Select>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <ButtonGroup>
            <Button
              onClick={submit}
              colorScheme="blue"
              isDisabled={inProgress || !isValid}
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
