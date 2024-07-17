import { Alert, AlertIcon } from "@chakra-ui/react";
import { ReactNode } from "react";
import { PODSheetPreview } from "./PODSheetPreview";

export function PODSheetPreviewEditWrapper({
  pipelineDefinitionText,
  onChange
}: {
  pipelineDefinitionText: string;
  onChange?: (newCsv: string) => void;
}): ReactNode {
  let csv: string = "";
  let error = false;
  try {
    const data = JSON.parse(pipelineDefinitionText);
    csv = data.options.input.csv;
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

  return <PODSheetPreview csv={csv} onChange={onChange} />;
}
