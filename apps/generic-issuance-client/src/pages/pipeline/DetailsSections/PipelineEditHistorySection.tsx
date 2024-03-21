import { Button } from "@chakra-ui/react";
import {
  PipelineHistoryEntry,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import React, { useMemo } from "react";
import { useGIContext } from "../../../helpers/Context";

export function PipelineEditHistorySection({
  pipelineInfo
}: {
  pipelineInfo: PipelineInfoResponseValue;
}): React.ReactNode {
  const entries = useMemo(() => {
    return pipelineInfo.editHistory ?? [];
  }, [pipelineInfo.editHistory]);

  return (
    <div>
      pipeline edit history length: {entries.length}
      {entries.map((e, i) => (
        <Entry pipelineInfo={pipelineInfo} entry={e} key={i} />
      ))}
    </div>
  );
}

function Entry({
  entry
}: {
  pipelineInfo: PipelineInfoResponseValue;
  entry: PipelineHistoryEntry;
}): React.ReactNode {
  const ctx = useGIContext();

  return (
    <Button
      onClick={(): void => {
        ctx.setState({
          viewingHistory: entry
        });
      }}
    >
      {new Date(entry.timeCreated).toLocaleDateString()}
    </Button>
  );
}
