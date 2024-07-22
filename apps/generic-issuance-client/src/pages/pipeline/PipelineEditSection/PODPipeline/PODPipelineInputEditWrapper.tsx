import { Alert, AlertIcon } from "@chakra-ui/react";
import {
  CSVInput,
  PODPipelineDefinition,
  PipelineDefinitionSchema,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PODPipelineEditAction } from "./PODPipelineEdit";
import { PODPipelineInputEdit } from "./PODPipelineInputEdit";

export function PODPipelineInputEditWrapper({
  pipelineDefinitionText,
  dispatch
}: {
  pipelineDefinitionText: string;
  dispatch: React.Dispatch<PODPipelineEditAction>;
}): ReactNode {
  let error = false;
  let csvInput: CSVInput | undefined = undefined;
  let definition: PODPipelineDefinition | undefined = undefined;
  try {
    const parsed = PipelineDefinitionSchema.parse(
      JSON.parse(pipelineDefinitionText)
    );
    if (parsed.type === PipelineType.POD) {
      definition = parsed;
      csvInput = new CSVInput(definition.options.input);
    } else {
      error = true;
    }
  } catch (e) {
    error = true;
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        The pipeline is not configured correctly. Switch back to Configuration
        view to ensure that the configuration is valid.
      </Alert>
    );
  }

  return (
    csvInput &&
    definition && (
      <PODPipelineInputEdit csvInput={csvInput} dispatch={dispatch} />
    )
  );
}
