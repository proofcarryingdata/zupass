import {
  GenericIssuancePipelineListEntry,
  GenericIssuanceSelf
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PipelineListEntry } from "../components/PipelineListEntry";

export function AdminPipelinesSection({
  self,
  pipelineEntries
}: {
  self?: GenericIssuanceSelf;
  pipelineEntries: GenericIssuancePipelineListEntry[];
}): ReactNode {
  if (!self?.isAdmin) {
    return null;
  }

  return (
    <div>
      <h2>All Other Pipelines (admin-only view)</h2>
      <ol>
        {pipelineEntries
          .filter((p) => p.pipeline.ownerUserId !== self?.id)
          .map((p) => (
            <PipelineListEntry entry={p} key={p.pipeline.id} />
          ))}
      </ol>
    </div>
  );
}
