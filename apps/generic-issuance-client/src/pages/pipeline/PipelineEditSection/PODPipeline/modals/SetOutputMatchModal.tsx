import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ButtonGroup,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select
} from "@chakra-ui/react";
import {
  PODPipelineOutput,
  PODPipelineOutputMatch,
  PODPipelineOutputMatchSchema,
  PODPipelinePODEntries,
  PODPipelinePODEntry
} from "@pcd/passport-interface";
import { ReactNode, useCallback, useMemo, useState } from "react";

export function SetOutputMatchModal({
  isOpen,
  onCancel,
  onChange,
  output,
  entries
}: {
  isOpen: boolean;
  onCancel: () => void;
  onChange: (match: PODPipelineOutputMatch) => void;
  output: PODPipelineOutput;
  entries: PODPipelinePODEntries;
}): ReactNode {
  const [match, setMatch] = useState<Partial<PODPipelineOutputMatch>>(
    output.match
  );

  const isValid = useMemo(() => {
    return PODPipelineOutputMatchSchema.safeParse(match).success;
  }, [match]);

  const triggerClose = useCallback(() => {
    onCancel();
    setMatch(output.match);
  }, [onCancel, output.match]);

  const submit = useCallback(async () => {
    onChange(PODPipelineOutputMatchSchema.parse(match));
  }, [match, onChange]);

  const findEntriesByType = useCallback(
    (type: PODPipelinePODEntry["type"]) => {
      return Object.entries(entries).filter(
        ([_entry, entryData]) => entryData.type === type
      );
    },
    [entries]
  );

  const setMatchType = useCallback(
    (type: PODPipelineOutputMatch["type"]) => {
      if (type === "none") {
        setMatch({ type: "none" });
      } else if (type === "email") {
        const validEntries = findEntriesByType("string");
        setMatch({ type: "email", entry: validEntries[0]?.[0] });
      } else if (type === "semaphoreID") {
        const validEntries = findEntriesByType("cryptographic");
        setMatch({ type: "semaphoreID", entry: validEntries[0]?.[0] });
      }
    },
    [findEntriesByType]
  );

  const setMatchEntry = useCallback(
    (entry: string) => {
      setMatch({ entry, type: match.type });
    },
    [match.type]
  );

  const validEntries: [string, PODPipelinePODEntry][] = useMemo(
    () =>
      findEntriesByType(match.type === "email" ? "string" : "cryptographic"),
    [findEntriesByType, match.type]
  );

  return (
    <Modal
      onClose={triggerClose}
      isOpen={isOpen}
      isCentered
      motionPreset="slideInBottom"
      size="xl"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Choose PCD Recipients</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Alert status="info" mb="16px" fontSize="sm">
            <AlertIcon />
            <AlertDescription>
              PCDs can be issued to recipients based on a match between a field
              from their authentication credential and an entry in the POD.
              Select the authentication credential field and the matching POD
              entry below.
            </AlertDescription>
          </Alert>
          <HStack spacing={3}>
            <div>Filter</div>
            <div>
              <Select
                value={match.type}
                onChange={(ev) =>
                  setMatchType(
                    ev.target.value as PODPipelineOutputMatch["type"]
                  )
                }
              >
                <option value="none">None</option>
                <option value="email">Zupass Email</option>
                <option value="semaphoreID">Semaphore ID</option>
              </Select>
            </div>
            {match.type !== "none" && (
              <>
                {validEntries.length > 0 &&
                  (match.type === "email" || match.type === "semaphoreID") && (
                    <>
                      <div>equals</div>
                      <div>
                        <Select
                          value={match.entry}
                          onChange={(ev) => setMatchEntry(ev.target.value)}
                        >
                          <option value={undefined} disabled>
                            -
                          </option>
                          {validEntries.map(([entry, _entryData]) => (
                            <option key={entry} value={entry}>
                              {entry}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </>
                  )}
              </>
            )}
          </HStack>
          {match.type !== "none" && validEntries.length === 0 && (
            <Alert status="warning" my="8px">
              <AlertIcon />
              <AlertDescription>
                {match.type === "email"
                  ? "Zupass Email can only be matched with 'string' entries, but no such entries are configured."
                  : "Semaphore ID can only be matched with 'cryptographic' entries, but no such entries are configured."}
              </AlertDescription>
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <ButtonGroup>
            <Button
              onClick={submit}
              colorScheme={isValid ? "blue" : "gray"}
              disabled={!isValid}
            >
              Save
            </Button>
            <Button onClick={triggerClose}>Cancel</Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
