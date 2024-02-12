import { Badge, Heading } from "@chakra-ui/react";
import { PipelineDefinition } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PipelineDisplayNameText } from "../../components/PipelineDisplayUtils";

export function PodboxButton({
  pipeline
}: {
  pipeline?: PipelineDefinition;
}): ReactNode {
  if (!pipeline) {
    return null;
  }

  return (
    <Heading size="sm">
      <PipelineDisplayNameText pipeline={pipeline} /> &nbsp;&nbsp;&nbsp;
      <Badge>{pipeline.id}</Badge>
    </Heading>
  );
}
