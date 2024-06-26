import {
  Alert,
  AlertIcon,
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
  ModalOverlay,
  Select,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import {
  CSVPipelineDefinition,
  PipelineDefinition,
  PipelineDefinitionSchema,
  PipelineType
} from "@pcd/passport-interface";
import { parse } from "csv-parse/sync";
import { ReactNode, useCallback, useMemo, useState } from "react";
import styled from "styled-components";

function AddConfiguredValueModal({
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

function ValidatedOutputs({
  definition,
  onChange
}: {
  definition: CSVPipelineDefinition;
  onChange?: (newDefinition: CSVPipelineDefinition) => void;
}): ReactNode {
  const { podOutput } = definition.options;

  const parsedCSV = parse(definition.options.csv, { columns: true });
  const columns = useMemo(
    () => (parsedCSV.length > 0 ? Object.keys(parsedCSV[0]) : []),
    [parsedCSV]
  );
  const entries = Object.entries(podOutput ?? []);
  const entryObj = Object.fromEntries(entries);

  const sources = [
    ["credentialEmail", "Zupass Email"],
    ["credentialSemaphoreID", "Semaphore ID"],
    ...columns.map((col) => [`input:${col}`, `CSV: ${col}`]),
    ...entries.flatMap(([_, entry]) =>
      entry.source.type === "configured"
        ? [
            [
              `configured:${entry.source.value}`,
              `Configured: ${entry.source.value}`
            ]
          ]
        : []
    )
  ];

  const changeSource = useCallback(
    async (key: string, source: string) => {
      const entry = structuredClone(entryObj[key]);
      // At some point in the future we will need to support more flexible
      // types. For now, we only support strings, except for Semaphore IDs.
      // Support for non-string data will depend on a solution to parsing or
      // coercion.
      entry.type =
        source === "credentialSemaphoreID" ? "cryptographic" : "string";

      if (source.startsWith("input:")) {
        entry.source = { type: "input", name: source.substring(6) };
      } else if (source.startsWith("configured:")) {
        entry.source = { type: "configured", value: source.substring(11) };
      } else if (source === "credentialEmail") {
        entry.source.type = source;
      } else if (source === "credentialSemaphoreID") {
        entry.source.type = source;
      } else if (source === "new") {
        setAddingConfiguredValueForKey(key);
        return;
      }

      const newDefinition = structuredClone(definition);
      newDefinition.options.podOutput = { ...podOutput, [key]: entry };
      onChange?.(newDefinition);
    },
    [definition, entryObj, onChange, podOutput]
  );

  const [addingConfiguredValueForKey, setAddingConfiguredValueForKey] =
    useState<string | undefined>(undefined);
  const addConfiguredValue = useCallback(
    async (value: string) => {
      if (addingConfiguredValueForKey) {
        await changeSource(addingConfiguredValueForKey, `configured:${value}`);
        setAddingConfiguredValueForKey(undefined);
      }
    },
    [addingConfiguredValueForKey, changeSource]
  );

  const addNewEntry = useCallback(() => {
    const newDefinition = structuredClone(definition);
    let key = "new_entry";
    let retries = 0;
    while (key in (newDefinition.options.podOutput ?? {})) {
      retries++;
      key = `new_entry_${retries}`;
    }

    newDefinition.options.podOutput = {
      ...newDefinition.options.podOutput,
      [key]: { type: "string", source: { type: "input", name: columns[0] } }
    };
    onChange?.(newDefinition);
  }, [columns, definition, onChange]);

  const removeEntry = useCallback(
    (key: string) => {
      const newDefinition = structuredClone(definition);
      delete newDefinition.options.podOutput?.[key];
      onChange?.(newDefinition);
    },
    [definition, onChange]
  );

  return (
    <Outputs>
      <AddConfiguredValueModal
        isOpen={!!addingConfiguredValueForKey}
        onSubmit={addConfiguredValue}
        onCancel={() => setAddingConfiguredValueForKey(undefined)}
      />
      {podOutput && (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th padding={0}></Th>
              <Th>Name</Th>
              <Th>Source</Th>
              <Th>Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Object.entries(podOutput).map(([key, entry]) => {
              const selectedSource =
                entry.source.type === "credentialEmail"
                  ? "credentialEmail"
                  : entry.source.type === "credentialSemaphoreID"
                  ? "credentialSemaphoreID"
                  : entry.source.type === "configured"
                  ? `configured:${entry.source.value}`
                  : `input:${entry.source.name}`;
              return (
                <Tr key={key}>
                  <Td padding={0}>
                    <span
                      title={`Remove "${key}"`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        removeEntry(key);
                      }}
                    >
                      ❌
                    </span>
                  </Td>
                  <Td>
                    <OutputItem>
                      <FormControl>
                        <Input type="text" value={key} />
                      </FormControl>
                    </OutputItem>
                  </Td>
                  <Td>
                    <Select
                      onChange={(ev) => changeSource(key, ev.target.value)}
                      value={selectedSource}
                    >
                      <option>-</option>
                      {sources.map(([source, label]) => {
                        return (
                          <option
                            value={source}
                            selected={source === selectedSource}
                          >
                            {label}
                          </option>
                        );
                      })}
                      <option value="new" selected={false}>
                        Add new configured value
                      </option>
                    </Select>
                  </Td>
                  <Td>{entry.type ?? "string"}</Td>
                </Tr>
              );
            })}
            <Tr>
              <Td padding={0}></Td>
              <Td colSpan={3}>
                <Button onClick={addNewEntry} colorScheme="blue">
                  Add new
                </Button>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      )}
    </Outputs>
  );
}

export function CSVPODOutputs({
  definition,
  onChange
}: {
  definition: string;
  onChange?: (newDefinition: string) => void;
}): ReactNode {
  let error = false;
  let parsed: PipelineDefinition | undefined;
  try {
    parsed = PipelineDefinitionSchema.parse(JSON.parse(definition));
  } catch (e) {
    error = true;
  }

  if (error || parsed?.type !== PipelineType.CSV) {
    return (
      <Alert status="error">
        <AlertIcon />
        The pipeline is not configured correctly. Switch back to Configuration
        view to ensure that the configuration is valid.
      </Alert>
    );
  }

  return (
    <ValidatedOutputs
      definition={parsed}
      onChange={(definition) => onChange?.(JSON.stringify(definition, null, 2))}
    />
  );
}

const OutputItem = styled.div``;
const Outputs = styled.div`
  padding-bottom: 20px;
`;
