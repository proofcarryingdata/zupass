import { Link } from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  PipelineDefinition,
  PipelineLoadSummary
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { Link as ReactLink } from "react-router-dom";
import { timeAgo } from "../../helpers/util";

export type PipelineStateDisplay = "starting" | "loaded" | "error" | "paused";

export function pipelineStatus(
  latestRun: PipelineLoadSummary | undefined
): ReactNode {
  if (!latestRun) {
    return "Starting";
  }

  if (latestRun.success) {
    return "Success";
  }

  return "Error";
}

export function pipelineIconFromStr(str: PipelineStateDisplay): ReactNode {
  if (str === "paused") {
    return "⏸️";
  }

  if (str === "starting") {
    return "⏳";
  }

  if (str === "loaded") {
    return "✅";
  }

  return "❌";
}
export function pipelineIcon(
  latestRun: PipelineLoadSummary | undefined
): ReactNode {
  if (!latestRun) {
    return "⏳";
  }

  if (latestRun.success) {
    return "✅";
  }

  return "❌";
}

export const NAME_CUTOFF_LENGTH = 16;
export const PLACEHOLDER_NAME = "untitled";

export function pipelineDisplayNameStr(
  pipeline?: PipelineDefinition
): string | undefined {
  if (!pipeline || !pipeline.options.name) {
    return PLACEHOLDER_NAME;
  }
  return pipeline.options.name.substring(0, NAME_CUTOFF_LENGTH);
}

export function pipelineDisplayNameSpan(
  pipeline?: PipelineDefinition
): ReactNode {
  const displayName = pipelineDisplayNameStr(pipeline);
  const hasName = !!pipeline?.options?.name;

  if (hasName) {
    return <span>{displayName}</span>;
  }

  return <span style={{ color: "rgba(0,0,0,0.1)" }}>{displayName}</span>;
}

export function pipelineDetailPagePath(pipelineId: string): string {
  return `/pipelines/${pipelineId}`;
}

export function pipelineLink(pipelineId: string | undefined): ReactNode {
  if (!pipelineId) {
    return null;
  }

  return (
    <Link as={ReactLink} to={pipelineDetailPagePath(pipelineId)}>
      edit
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

export function pipelineCreatedAt(dateStr: string): ReactNode {
  return (
    <>
      <span> {timeAgo.format(new Date(dateStr), "twitter")}</span>
    </>
  );
}

export function pipelineLastEdit(dateStr: string): ReactNode {
  return (
    <>
      <span> {timeAgo.format(new Date(dateStr), "twitter")}</span>
    </>
  );
}
