import { PODPipelineDefinition } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PODPipelineInputEdit } from "./PODPipelineInputEdit";
import { PODPipelineEditAction } from "./state";

export function PODPipelineInputEditWrapper({
  dispatch,
  definition
}: {
  dispatch: React.Dispatch<PODPipelineEditAction>;
  definition: PODPipelineDefinition;
}): ReactNode {
  return (
    definition && (
      <PODPipelineInputEdit definition={definition} dispatch={dispatch} />
    )
  );
}
