import { PipelineLoadSummary } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PodLink } from "../../components/Core";

/**
 * Displays a list of the Semaphore groups for the pipeline.
 */
export function PipelineSemaphoreGroupsSection({
  lastLoad
}: {
  lastLoad?: PipelineLoadSummary;
}): ReactNode {
  if (!lastLoad || !lastLoad.semaphoreGroups) {
    return null;
  }

  return (
    <>
      {lastLoad.semaphoreGroups.map((sg) => (
        <div style={{ marginLeft: "0.5rem" }} key={sg.groupId}>
          <PodLink to={sg.url} isExternal={true}>
            {sg.name} ({sg.memberCount}{" "}
            {sg.memberCount === 1 ? "member" : "members"})
          </PodLink>
        </div>
      ))}
    </>
  );
}
