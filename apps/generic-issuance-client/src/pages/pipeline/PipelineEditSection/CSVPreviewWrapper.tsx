import { Alert, AlertIcon } from "@chakra-ui/react";
import { ReactNode } from "react";
import { CSVPreview, PreviewType } from "./CSVPreview";

export function CSVPreviewWrapper({
  pipelineDefinitionText,
  previewType,
  onChange
}: {
  pipelineDefinitionText: string;
  previewType?: PreviewType;
  onChange?: (newCsv: string) => void;
}): ReactNode {
  let csv: string = "";
  let error = false;
  try {
    const data = JSON.parse(pipelineDefinitionText);
    csv = data.options.csv;
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

  return <CSVPreview csv={csv} previewType={previewType} onChange={onChange} />;
}
