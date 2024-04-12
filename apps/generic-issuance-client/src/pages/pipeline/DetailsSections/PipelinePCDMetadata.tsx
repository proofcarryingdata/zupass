import { PipelinePCDMetadata } from "@pcd/passport-interface";
import { ReactNode } from "react";

/**
 * Used to display metadata about the PCDs produced by the pipeline.
 */
export function PipelinePCDMetadataSection({
  pipelinePCDMetadata
}: {
  pipelinePCDMetadata?: PipelinePCDMetadata[];
}): ReactNode {
  if (!pipelinePCDMetadata || pipelinePCDMetadata.length === 0) {
    return <div>No PCD metadata available for this pipeline.</div>;
  }

  return (
    <div>
      {pipelinePCDMetadata.map((metadata: PipelinePCDMetadata) => {
        return (
          <pre style={{ whiteSpace: "pre-line" }} key={metadata.eventId}>
            {JSON.stringify(metadata)}
          </pre>
        );
      })}
    </div>
  );
}
