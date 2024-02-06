import {
  GenericIssuanceSelf,
  PipelineDefinition
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PipelineListEntry } from "../components/PipelineListEntry";

export function AdminPipelinesSection({
  self,
  pipelines
}: {
  self?: GenericIssuanceSelf;
  pipelines: PipelineDefinition[];
}): ReactNode {
  if (!self?.isAdmin) {
    return null;
  }

  return (
    <div>
      <h2>All Other Pipelines (admin-only view)</h2>
      <ol>
        {pipelines
          .filter((p) => p.ownerUserId !== self?.id)
          .map((p) => (
            <PipelineListEntry pipeline={p} key={p.id} />
          ))}
      </ol>
    </div>
  );
}
