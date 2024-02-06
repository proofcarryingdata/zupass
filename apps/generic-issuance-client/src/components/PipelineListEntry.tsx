import { GenericIssuancePipelineListEntry } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function PipelineListEntry({
  entry
}: {
  entry: GenericIssuancePipelineListEntry;
}): ReactNode {
  return (
    <li key={entry.pipeline.id}>
      <Link to={`/pipelines/${entry.pipeline.id}`}>
        {entry.pipeline.type} ({entry.pipeline.id.substring(0, 8)}...)
      </Link>{" "}
      by {entry.extraInfo.ownerEmail}
    </li>
  );
}
