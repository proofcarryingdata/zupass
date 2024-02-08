import {
  GenericIssuancePipelineListEntry,
  PipelineRunInfo
} from "@pcd/passport-interface";
import { ReactNode, useMemo } from "react";
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
  const icon = useMemo(() => {
    return pipelineIcon(entry);
  }, [entry]);

  return (
    <li key={entry.pipeline.id}>
      {pipelineLink(entry)}
      by {entry.extraInfo.ownerEmail} {icon}
    </li>
  );
}

export function pipelineStatus(
  latestRun: PipelineRunInfo | undefined
): ReactNode {
  if (!latestRun) {
    return "Waiting";
  }

  if (latestRun.success) {
    return "Success";
  }

  return "Error";
}

export function pipelineIcon(
  latestRun: PipelineRunInfo | undefined
): ReactNode {
  if (!latestRun) {
    return "⏳";
  }

  if (latestRun.success) {
    return "✅";
  }

  return "❌";
}

export function pipelineLink(
  entry: GenericIssuancePipelineListEntry
): ReactNode {
  return (
    <Link to={`/pipelines/${entry.pipeline.id}`}>
      {entry.pipeline.id.substring(0, 8)}...
    </Link>
  );
}

export function pipelineOwner(
  entry: GenericIssuancePipelineListEntry
): ReactNode {
  return entry.extraInfo.ownerEmail;
}

export function pipelineType(
  entry: GenericIssuancePipelineListEntry
): ReactNode {
  return <span>{entry.pipeline.type}</span>;
}
