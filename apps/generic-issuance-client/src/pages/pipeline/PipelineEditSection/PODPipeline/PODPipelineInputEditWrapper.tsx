import { CSVInput, PODPipelineDefinition } from "@pcd/passport-interface";
import { ReactNode, useMemo } from "react";
import { PODPipelineInputEdit } from "./PODPipelineInputEdit";
import { PODPipelineEditAction } from "./state";

export function PODPipelineInputEditWrapper({
  dispatch,
  definition
}: {
  dispatch: React.Dispatch<PODPipelineEditAction>;
  definition: PODPipelineDefinition;
}): ReactNode {
  const csvInput = useMemo(
    () => new CSVInput(definition.options.input),
    [definition.options.input]
  );

  return (
    csvInput &&
    definition && (
      <PODPipelineInputEdit csvInput={csvInput} dispatch={dispatch} />
    )
  );
}
