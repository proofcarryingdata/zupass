import {
  LemonadePipelineDefinition,
  PipelineDefinition,
  PretixPipelineDefinition,
  isLemonadePipelineDefinition,
  isPretixPipelineDefinition
} from "@pcd/passport-interface";
import { ReactNode } from "react";

export function shouldShowManualTicketsSection(
  pipeline: PipelineDefinition
): pipeline is LemonadePipelineDefinition | PretixPipelineDefinition {
  return (
    isLemonadePipelineDefinition(pipeline) ||
    isPretixPipelineDefinition(pipeline)
  );
}

export function PipelineManualTicketsSection({
  pipeline
}: {
  pipeline: LemonadePipelineDefinition | PretixPipelineDefinition;
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
