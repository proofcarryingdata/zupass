import { Alert, AlertIcon } from "@chakra-ui/react";
import { ReactNode, useMemo } from "react";
import { CSVPreview, PreviewType } from "./CSVPreview";

export function CSVPreviewEditWrapper({
  pipelineDefinitionText,
  previewType,
  onChange
}: {
  pipelineDefinitionText: string;
  previewType?: PreviewType;
  onChange?: (newCsv: string) => void;
}): ReactNode {
  const { csv, error } = useMemo(() => {
    let csv: string = "";
    let error = false;
    try {
      const data = JSON.parse(pipelineDefinitionText);
      csv = data.options.csv;
    } catch (e) {
      error = true;
    }
    return { csv, error };
  }, [pipelineDefinitionText]);

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
    <>
      <CSVPreview csv={csv} previewType={previewType} onChange={onChange} />
    </>
  );
}
