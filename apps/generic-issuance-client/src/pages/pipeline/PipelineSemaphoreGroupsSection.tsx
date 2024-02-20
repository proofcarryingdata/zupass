import { PipelineLoadSummary } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PodLink } from "../../components/Core";

/**
 * Renders information about the last time this pipeline was run by Podbox.
 * Useful for debugging an integration, and figuring out what went wrong.
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
