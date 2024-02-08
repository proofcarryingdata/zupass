import {
  GenericIssuancePipelineListEntry,
  PipelineRunInfo
} from "@pcd/passport-interface";
import moment from "moment";
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
    return pipelineIcon(entry.extraInfo.lastRun);
  }, [entry]);

  return (
    <li key={entry.pipeline.id}>
      {pipelineLink(entry.pipeline.id)}
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

export function pipelineLink(pipelineId: string | undefined): ReactNode {
  if (!pipelineId) {
    return null;
  }

  return (
    <Link to={`/pipelines/${pipelineId}`}>{pipelineId.substring(0, 8)}...</Link>
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

export function pipelineCreatedAt(timestamp: number): ReactNode {
  return <span>{moment(new Date(timestamp)).format("MMM D YYYY")}</span>;
}

export function pipeineLastEdit(timestamp: number): ReactNode {
  return (
    <span>{moment(new Date(timestamp)).format("MMM D YYYY, h:mm:ss a")}</span>
  );
}
