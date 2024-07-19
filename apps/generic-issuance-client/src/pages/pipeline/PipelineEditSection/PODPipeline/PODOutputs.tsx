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
  CSVInput,
  PODPipelineDefinition,
  PODPipelinePODEntry,
  PipelineDefinition,
  PipelineDefinitionSchema,
  PipelineType,
  getInputToPODValueConverter
} from "@pcd/passport-interface";
import { POD_NAME_REGEX } from "@pcd/pod";
import { ReactNode, useCallback, useMemo, useState } from "react";
import styled from "styled-components";

function EditableName({
  name,
  onChange,
  validate
}: {
  name: string;
  onChange: (newName: string) => void;
  validate: (newName: string) => boolean;
}): ReactNode {
  const [editedName, setEditedName] = useState<string>(name);
  const isValid = validate(editedName);

  const finish = useCallback(() => {
    if (isValid) {
      onChange(editedName);
    } else {
      setEditedName(name);
    }
  }, [editedName, isValid, name, onChange]);

  return (
    <Input
      color={!isValid ? "red" : undefined}
      isInvalid={!isValid}
      value={editedName}
      onChange={(e) => setEditedName(e.target.value)}
      onBlur={() => finish()}
      onSubmit={() => {
        if (isValid) {
          finish();
        }
      }}
    />
  );
}

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
  name,
  definition,
  onChange,
  csvInput
}: {
  name: string;
  definition: PODPipelineDefinition;
  onChange: (newDefinition: PODPipelineDefinition) => void;
  csvInput: CSVInput;
}): ReactNode {
  const { outputs } = definition.options;
  const output = outputs[name];

  const columns = Object.keys(csvInput.getColumns());

  const entries = Object.entries(output.entries ?? []);
  const entryObj = Object.fromEntries(entries);

  const sources = [
    ["credentialEmail", "Zupass Email"],
    ["credentialSemaphoreID", "Semaphore ID"],
    ...columns.map((col) => [`input:${col}`, `Data: ${col}`]),
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
      if (source.startsWith("input:")) {
        entry.source = { type: "input", name: source.substring(6) };
        const existingType = entry.type;
        // Output entries have configured types. If the existing type for this
        // output is still valid for the changed input source, do nothing, but
        // otherwise default to string type.
        if (
          !getInputToPODValueConverter(
            csvInput.getColumns()[entry.source.name],
            existingType
          )
        ) {
          entry.type = "string";
        }
      } else if (source.startsWith("configured:")) {
        entry.source = { type: "configured", value: source.substring(11) };
        entry.type = "string";
      } else if (source === "credentialEmail") {
        entry.source.type = source;
        entry.type = "string";
      } else if (source === "credentialSemaphoreID") {
        entry.source.type = source;
        entry.type = "cryptographic";
      } else if (source === "new") {
        setAddingConfiguredValueForKey(key);
        return;
      }

      const newDefinition = structuredClone(definition);
      newDefinition.options.outputs[name].entries[key] = entry;
      onChange(newDefinition);
    },
    [csvInput, definition, entryObj, name, onChange]
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
    while (key in (newDefinition.options.outputs[name].entries ?? {})) {
      retries++;
      key = `new_entry_${retries}`;
    }

    newDefinition.options.outputs[name].entries = {
      ...newDefinition.options.outputs[name].entries,
      [key]: { type: "string", source: { type: "input", name: columns[0] } }
    };
    onChange(newDefinition);
  }, [columns, definition, name, onChange]);

  const removeEntry = useCallback(
    (key: string) => {
      const newDefinition = structuredClone(definition);
      delete newDefinition.options.outputs[name].entries?.[key];
      onChange(newDefinition);
    },
    [definition, name, onChange]
  );

  const changeType = useCallback(
    (key: string, type: PODPipelinePODEntry["type"]) => {
      const newDefinition = structuredClone(definition);
      newDefinition.options.outputs[name].entries[key].type = type;
      onChange(newDefinition);
    },
    [definition, name, onChange]
  );

  const changeName = useCallback(
    (key: string, newName: string) => {
      const newDefinition = structuredClone(definition);
      newDefinition.options.outputs[name].entries = Object.fromEntries(
        Object.entries(newDefinition.options.outputs[name].entries).map(
          ([k, v]) => [k === key ? newName : k, v]
        )
      );
      onChange(newDefinition);
    },
    [definition, name, onChange]
  );

  return (
    <Outputs>
      <AddConfiguredValueModal
        isOpen={!!addingConfiguredValueForKey}
        onSubmit={addConfiguredValue}
        onCancel={() => setAddingConfiguredValueForKey(undefined)}
      />
      {output && (
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
            {Object.entries(output.entries).map(([key, entry]) => {
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
                        <EditableName
                          name={key}
                          onChange={(newName: string) => {
                            changeName(key, newName);
                          }}
                          validate={(newName: string) => {
                            return (
                              POD_NAME_REGEX.test(newName) &&
                              !Object.keys(output.entries).some(
                                (k) => k !== key && k === newName
                              )
                            );
                          }}
                        />
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
                            key={source}
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
                  <Td>
                    <Select
                      value={entry.type}
                      onChange={(ev) =>
                        changeType(
                          key,
                          // "string" | "cryptographic" | "int"
                          ev.target.value as PODPipelinePODEntry["type"]
                        )
                      }
                    >
                      {
                        // For a given source type, some outputs may not be
                        // available. For input sources, we only allow outputs
                        // that can be converted from the input type. For
                        // configured values and credential emails, only strings
                        // are allowed (though non-string configured values
                        // should be supported in future).
                        (
                          [
                            ["String", "string"],
                            ["Cryptographic", "cryptographic"],
                            ["Integer", "int"]
                          ] satisfies [string, PODPipelinePODEntry["type"]][]
                        )
                          .map(([label, value]) => {
                            if (entry.source.type === "input") {
                              if (
                                !getInputToPODValueConverter(
                                  csvInput.getColumns()[entry.source.name],
                                  value
                                )
                              ) {
                                return null;
                              }
                            } else if (entry.source.type === "configured") {
                              if (value !== "string") {
                                return null;
                              }
                            } else if (
                              entry.source.type === "credentialEmail"
                            ) {
                              if (value !== "string") {
                                return null;
                              }
                            }
                            return <option value={value}>{label}</option>;
                          })
                          .filter((val) => !!val)
                      }
                    </Select>
                  </Td>
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

function PODOutputsList({
  definition,
  onChange
}: {
  definition: PODPipelineDefinition;
  onChange: (newDefinition: string) => void;
}): ReactNode {
  const csvInput = useMemo(() => {
    return new CSVInput(definition.options.input);
  }, [definition]);

  return (
    <>
      {Object.keys(definition.options.outputs).map((name) => (
        <ValidatedOutputs
          name={name}
          csvInput={csvInput}
          definition={definition}
          onChange={(definition) =>
            onChange(JSON.stringify(definition, null, 2))
          }
        />
      ))}
    </>
  );
}

export function PODOutputs({
  definition,
  onChange
}: {
  definition: string;
  onChange: (newDefinition: string) => void;
}): ReactNode {
  let error = false;
  let parsed: PipelineDefinition | undefined;
  try {
    parsed = PipelineDefinitionSchema.parse(JSON.parse(definition));
  } catch (e) {
    error = true;
  }

  if (!parsed || error || parsed?.type !== PipelineType.POD) {
    return (
      <Alert status="error">
        <AlertIcon />
        The pipeline is not configured correctly. Switch back to Configuration
        view to ensure that the configuration is valid.
      </Alert>
    );
  }

  return <PODOutputsList definition={parsed} onChange={onChange} />;
}

const OutputItem = styled.div``;
const Outputs = styled.div`
  padding-bottom: 20px;
`;
