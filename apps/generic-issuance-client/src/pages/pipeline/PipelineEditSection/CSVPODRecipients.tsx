import { Alert, AlertIcon, Select } from "@chakra-ui/react";
import {
  CSVPipelineDefinition,
  PipelineDefinition,
  PipelineDefinitionSchema,
  PipelineType
} from "@pcd/passport-interface";
import { parse } from "csv-parse/sync";
import { ReactNode, useCallback, useMemo } from "react";
import styled from "styled-components";

function ValidatedRecipients({
  definition,
  onChange
}: {
  definition: CSVPipelineDefinition;
  onChange?: (newDefinition: CSVPipelineDefinition) => void;
}): ReactNode {
  const parsedCSV = parse(definition.options.csv, { columns: true });
  const columns = useMemo(
    () => (parsedCSV.length > 0 ? Object.keys(parsedCSV[0]) : []),
    [parsedCSV]
  );

  const setMatchType = useCallback(
    (type: string) => {
      const newDefinition = structuredClone(definition);
      newDefinition.options.match = {
        type: type as "email" | "semaphoreID",
        inputField: newDefinition.options.match?.inputField ?? ""
      };

      onChange?.(newDefinition);
    },
    [definition, onChange]
  );

  const setMatchInputField = useCallback(
    (inputField: string) => {
      const newDefinition = structuredClone(definition);
      newDefinition.options.match = {
        type: newDefinition.options.match?.type ?? "email",
        inputField
      };

      onChange?.(newDefinition);
    },
    [definition, onChange]
  );

  return (
    <Match>
      <div>Match</div>
      <div>
        <Select
          value={definition.options.match?.type}
          onChange={(ev) => setMatchType(ev.target.value)}
        >
          <option value="email">Zupass Email</option>
          <option value="semaphoreID">Semaphore ID</option>
        </Select>
      </div>
      <div>to</div>
      <div>
        <Select
          value={definition.options.match?.inputField}
          onChange={(ev) => setMatchInputField(ev.target.value)}
        >
          <option disabled>-</option>
          {columns.map((column) => {
            return (
              <option
                key={column}
                selected={definition.options.match?.inputField === column}
                value={column}
              >
                CSV: {column}
              </option>
            );
          })}
        </Select>
      </div>
    </Match>
  );
}

export function CSVPODRecipients({
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
    <ValidatedRecipients
      definition={parsed}
      onChange={(definition) => onChange?.(JSON.stringify(definition, null, 2))}
    />
  );
}

const Match = styled.div`
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  column-gap: 8px;
`;
