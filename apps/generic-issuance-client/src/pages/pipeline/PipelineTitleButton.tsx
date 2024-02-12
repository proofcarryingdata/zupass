import { Badge, Heading } from "@chakra-ui/react";
import { PipelineDefinition } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { pipelineDisplayNameStr } from "../../components/PipelineDisplayUtils";

export function PipelineTitleButton({
  pipeline
}: {
  pipeline?: PipelineDefinition;
}): ReactNode {
  if (!pipeline) {
    return null;
  }
  const str = pipelineDisplayNameStr(pipeline);

  return (
    <Heading size="sm">
      {str}&nbsp;&nbsp;&nbsp;<Badge>{pipeline.id}</Badge>
    </Heading>
  );
}
