import { PipelineDefinition } from "@pcd/passport-interface";
import { ReactNode } from "react";

export function PipelineManualTicketsSection({
  pipeline
}: {
  pipeline: PipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  return (
    <div>
      manual tickets section
      <br />
      <br />
      {}
    </div>
  );
}
