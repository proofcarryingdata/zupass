import { GenericIssuancePipelineListEntry } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Renders a {@link GenericIssuancePipelineListEntry} as part of a list.
 * This data structure is returned from the generic issuance server when the
 * generic issuance client asks for a bunch of pipelines, e.g. when it asks
 * the server 'plz give me all my pipelines'.
 */
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
