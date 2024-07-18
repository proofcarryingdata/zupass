import { Alert, AlertIcon } from "@chakra-ui/react";
import {
  CSVInput,
  PODPipelineInput,
  PipelineDefinitionSchema,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PODSheetPreview } from "./PODSheetPreview";

export function PODSheetPreviewEditWrapper({
  pipelineDefinitionText,
  onChange
}: {
  pipelineDefinitionText: string;
  onChange: (newInput: PODPipelineInput) => void;
}): ReactNode {
  let error = false;
  let csvInput: CSVInput | undefined = undefined;
  try {
    const parsed = PipelineDefinitionSchema.parse(
      JSON.parse(pipelineDefinitionText)
    );
    if (parsed.type === PipelineType.POD) {
      csvInput = new CSVInput(parsed.options.input);
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
    csvInput && <PODSheetPreview csvInput={csvInput} onChange={onChange} />
  );
}
