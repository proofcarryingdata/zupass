import {
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { ReactNode } from "react";

export function PipelineManualTicketsSection({
  pipeline
}: {
  pipelineInfo: PipelineInfoResponseValue;
  pipeline: PipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  return (
    <div>
      manual tickets section
      <br />
      <br />
      {pipeline.id}
    </div>
  );
}
