import { Heading } from "@chakra-ui/react";
import { PipelineDefinition } from "@pcd/passport-interface";
import { ReactNode } from "react";

export function PipelineTitleButton({
  pipeline
}: {
  pipeline?: PipelineDefinition;
}): ReactNode {
  if (!pipeline) {
    return null;
  }

  return <Heading size="sm">{pipeline.id}</Heading>;
}
