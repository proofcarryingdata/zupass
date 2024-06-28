import {
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  Input,
  VStack
} from "@chakra-ui/react";
import {
  CSVPipelineDefinition,
  PipelineDefinition,
  PipelineDefinitionSchema,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode, useCallback } from "react";

function ValidatedFeedConfig({
  definition,
  onChange
}: {
  definition: CSVPipelineDefinition;
  onChange?: (definition: CSVPipelineDefinition) => void;
}): ReactNode {
  const feedOptions = definition.options.feedOptions;

  const onChangeField = useCallback(
    (value: string, field: string) => {
      const newDefinition = structuredClone(definition);
      newDefinition.options.feedOptions[field] = value;
      onChange?.(newDefinition);
    },
    [definition, onChange]
  );

  return (
    <VStack spacing={4}>
      <FormControl>
        <FormLabel>Feed name</FormLabel>
        <Input
          type="text"
          value={feedOptions.feedDisplayName}
          onChange={(ev) => onChangeField(ev.target.value, "feedDisplayName")}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Feed description</FormLabel>
        <Input
          type="text"
          value={feedOptions.feedDescription}
          onChange={(ev) => onChangeField(ev.target.value, "feedDescription")}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Feed folder</FormLabel>
        <Input
          type="text"
          value={feedOptions.feedFolder}
          onChange={(ev) => onChangeField(ev.target.value, "feedFolder")}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Feed ID</FormLabel>
        <Input
          type="text"
          value={feedOptions.feedId}
          onChange={(ev) => onChangeField(ev.target.value, "feedDisplayName")}
        />
      </FormControl>
    </VStack>
  );
}

export function CSVPODFeed({
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
    <ValidatedFeedConfig
      definition={parsed}
      onChange={(definition) => onChange?.(JSON.stringify(definition, null, 2))}
    />
  );
}
