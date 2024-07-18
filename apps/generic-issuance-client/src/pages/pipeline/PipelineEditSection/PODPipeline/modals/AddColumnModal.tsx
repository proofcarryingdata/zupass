import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  VStack
} from "@chakra-ui/react";
import {
  InputColumn,
  PODPipelineInputFieldType
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useMemo, useState } from "react";

export function AddColumnModal({
  onAddColumn,
  isOpen,
  onClose,
  columns
}: {
  onAddColumn: (name: string, type: PODPipelineInputFieldType) => void;
  isOpen: boolean;
  onClose: () => void;
  columns: Record<string, InputColumn>;
}): ReactNode {
  const [name, setName] = useState("");
  const [type, setType] = useState<PODPipelineInputFieldType | undefined>();
  useEffect(() => {
    setName("");
    setType(undefined);
  }, [isOpen]);
  const columnNames = useMemo(() => new Set(Object.keys(columns)), [columns]);
  const invalidInput =
    name === "" || type === undefined || columnNames.has(name);
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Column</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={2}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Enter the name for the new column"
                  autoFocus={true}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  placeholder="Select the type for the new column"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as PODPipelineInputFieldType)
                  }
                >
                  <option value="string">String</option>
                  <option value="integer">Integer</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="uuid">UUID</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme={invalidInput ? "gray" : "blue"}
              mr={3}
              disabled={invalidInput}
              onClick={() => {
                if (!invalidInput) onAddColumn(name, type);
              }}
            >
              Add Column
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
