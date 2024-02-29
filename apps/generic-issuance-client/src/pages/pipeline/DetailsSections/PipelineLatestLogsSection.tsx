import { PipelineLoadSummary } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { FancyEditor } from "../../../components/FancyEditor";

/**
 * Renders information about the last time this pipeline was run by Podbox.
 * Useful for debugging an integration, and figuring out what went wrong.
 */
export function PipelineLatestLogsSection({
  lastLoad
}: {
  lastLoad?: PipelineLoadSummary;
}): ReactNode {
  if (!lastLoad) {
    return null;
  }

  return (
    <FancyEditor
      dark
      style={{ width: "100%", height: "300px" }}
      readonly={true}
      value={lastLoad.latestLogs
        .map((log) => `${log.timestampCreated} - ${log.level} - ${log.value}`)
        .join("\n")}
    />
  );
}
