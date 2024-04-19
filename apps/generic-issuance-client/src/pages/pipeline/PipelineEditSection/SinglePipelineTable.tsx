import { Box } from "@chakra-ui/react";
import {
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { ReactNode, useMemo } from "react";
import { PipelineTable } from "../../dashboard/PipelineTable";

export function SinglePipelineTable({
  pipeline,
  pipelineInfo
}: {
  pipeline: PipelineDefinition;
  pipelineInfo: PipelineInfoResponseValue;
}): ReactNode {
  const singleRow = useMemo(() => {
    return [
      {
        extraInfo: pipelineInfo,
        pipeline: pipeline
      }
    ];
  }, [pipeline, pipelineInfo]);

  return (
    <Box maxW={"100%"}>
      <PipelineTable
        entries={singleRow}
        isAdminView={false}
        singleRowMode={true}
      />
    </Box>
  );
}
