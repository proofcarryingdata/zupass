import {
  PipelineHistoryEntry,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import React, { useMemo } from "react";

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
  return <div>{new Date(entry.timeCreated).toLocaleDateString()}</div>;
}
