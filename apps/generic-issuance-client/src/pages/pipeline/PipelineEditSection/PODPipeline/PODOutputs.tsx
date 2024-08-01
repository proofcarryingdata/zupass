import {
  Button,
  FormControl,
  Heading,
  Input,
  Select,
  Spacer,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure
} from "@chakra-ui/react";

import {
  PODPipelineDefinition,
  PODPipelineOutputMatch,
  PODPipelinePODEntry,
  PODPipelineSupportedPODValueTypes
} from "@pcd/passport-interface";
import { POD_NAME_REGEX } from "@pcd/pod";
import { getInputToPODValueConverter } from "@pcd/podbox-shared";
import { Dispatch, ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { AddConfiguredValueModal } from "./modals/AddConfiguredValueModal";
import { SetOutputMatchModal } from "./modals/SetOutputMatchModal";
import { PODPipelineEditAction, PODPipelineEditActionType } from "./state";

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

function PODOutput({
  name,
  definition,
  dispatch
}: {
  name: string;
  definition: PODPipelineDefinition;
  dispatch: Dispatch<PODPipelineEditAction>;
}): ReactNode {
  const { outputs } = definition.options;
  const output = outputs[name];

  const columns = Object.keys(definition.options.input.columns);

  const outputEntries = Object.entries(output.entries ?? []);
  const outputEntryMap = Object.fromEntries(outputEntries);

  const {
    isOpen: isSetOutputMatchModalOpen,
    onOpen: openSetOutputMatchModal,
    onClose: closeSetOutputMatchModal
  } = useDisclosure();

  const sources = [
    ["credentialEmail", "Zupass Email"],
    ["credentialSemaphoreID", "Semaphore ID"],
    ...columns.map((col) => [`input:${col}`, `Data: ${col}`]),
    ...outputEntries.flatMap(([_, entry]) =>
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

  // Change the source of an output, e.g. from one input field to another
  const changeSource = useCallback(
    (key: string, source: string, type?: PODPipelineSupportedPODValueTypes) => {
      const entry = structuredClone(outputEntryMap[key]);
      if (source.startsWith("input:")) {
        entry.source = { type: "input", name: source.substring(6) };
        const existingType = entry.type;
        // Output entries have configured types. If the existing type for this
        // output is still valid for the changed input source, do nothing, but
        // otherwise default to string type.
        if (
          !getInputToPODValueConverter(
            definition.options.input.columns[entry.source.name].type,
            existingType
          )
        ) {
          entry.type = "string";
        }
      } else if (source.startsWith("configured:")) {
        entry.source = { type: "configured", value: source.substring(11) };
        entry.type = type ?? "string";
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

      dispatch({
        type: PODPipelineEditActionType.ChangeOutputEntry,
        outputName: name,
        key,
        entry
      });
    },
    [definition.options.input.columns, dispatch, outputEntryMap, name]
  );

  const [addingConfiguredValueForKey, setAddingConfiguredValueForKey] =
    useState<string | undefined>(undefined);
  const addConfiguredValue = useCallback(
    async (value: string, type: PODPipelineSupportedPODValueTypes) => {
      if (addingConfiguredValueForKey) {
        changeSource(addingConfiguredValueForKey, `configured:${value}`, type);
        setAddingConfiguredValueForKey(undefined);
      }
    },
    [addingConfiguredValueForKey, changeSource]
  );

  const addNewEntry = useCallback(() => {
    dispatch({
      type: PODPipelineEditActionType.AddOutputEntry,
      outputName: name
    });
  }, [dispatch, name]);

  const removeEntry = useCallback(
    (key: string) => {
      dispatch({
        type: PODPipelineEditActionType.DeleteOutputEntry,
        outputName: name,
        key
      });
    },
    [dispatch, name]
  );

  const changeType = useCallback(
    (key: string, type: PODPipelinePODEntry["type"]) => {
      dispatch({
        type: PODPipelineEditActionType.ChangeOutputEntryType,
        outputName: name,
        key,
        newType: type
      });
    },
    [dispatch, name]
  );

  const changeName = useCallback(
    (key: string, newName: string) => {
      dispatch({
        type: PODPipelineEditActionType.ChangeOutputEntryName,
        outputName: name,
        key,
        newName
      });
    },
    [dispatch, name]
  );

  const changeMatch = useCallback(
    (match: PODPipelineOutputMatch) => {
      dispatch({
        type: PODPipelineEditActionType.ChangeOutputMatch,
        outputName: name,
        match
      });
      closeSetOutputMatchModal();
    },
    [dispatch, name, closeSetOutputMatchModal]
  );

  return (
    <Outputs>
      <AddConfiguredValueModal
        isOpen={!!addingConfiguredValueForKey}
        onSubmit={addConfiguredValue}
        onCancel={() => setAddingConfiguredValueForKey(undefined)}
      />
      <Heading size="md">POD Output</Heading>
      <Spacer h={2} />
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
                  : entry.source.type === "signerPublicKey"
                  ? "signerPublicKey"
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
                  </Td>
                  <Td>
                    <Select
                      onChange={(ev) => changeSource(key, ev.target.value)}
                      value={selectedSource}
                    >
                      <option>-</option>
                      {sources.map(([source, label]) => {
                        return (
                          <option key={source} value={source}>
                            {label}
                          </option>
                        );
                      })}
                      <option value="new">Add new configured value</option>
                    </Select>
                  </Td>
                  <Td>
                    <Select
                      value={entry.type}
                      onChange={(ev) =>
                        changeType(
                          key,
                          // "string" | "cryptographic" | "int" | "eddsa_pubkey"
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
                            ["Integer", "int"],
                            ["Public Key", "eddsa_pubkey"]
                          ] satisfies [string, PODPipelinePODEntry["type"]][]
                        )
                          .map(([label, value]) => {
                            if (entry.source.type === "input") {
                              if (
                                !getInputToPODValueConverter(
                                  definition.options.input.columns[
                                    entry.source.name
                                  ].type,
                                  value
                                )
                              ) {
                                return null;
                              }
                            } else if (entry.source.type === "configured") {
                              if (value !== entry.type) {
                                return null;
                              }
                            } else if (
                              entry.source.type === "credentialEmail"
                            ) {
                              if (value !== "string") {
                                return null;
                              }
                            }
                            return (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            );
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
                <Button onClick={addNewEntry} colorScheme="blue" size="sm">
                  Add new
                </Button>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      )}

      <Heading size="sm" my="16px">
        Recipients
      </Heading>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Text fontSize="sm">
          {output.match.type === "none" ? (
            "All users will receive all PCDs issued by this pipeline."
          ) : (
            <>
              PCDs will be issued to users whose{" "}
              {output.match.type === "email" ? "email" : "Semaphore ID"} matches
              the entry <strong>{output.match.entry}</strong>.
            </>
          )}
        </Text>

        <Button size="sm" onClick={openSetOutputMatchModal}>
          Edit
        </Button>
      </div>
      <SetOutputMatchModal
        isOpen={isSetOutputMatchModalOpen}
        onCancel={closeSetOutputMatchModal}
        onChange={changeMatch}
        output={output}
        entries={outputEntryMap}
      />
    </Outputs>
  );
}

export function PODOutputs({
  definition,
  dispatch
}: {
  definition: PODPipelineDefinition;
  dispatch: Dispatch<PODPipelineEditAction>;
}): ReactNode {
  return (
    <>
      {Object.keys(definition.options.outputs).map((name) => (
        <PODOutput
          key={name}
          name={name}
          definition={definition}
          dispatch={dispatch}
        />
      ))}
    </>
  );
}

const Outputs = styled.div`
  padding-bottom: 20px;
`;
