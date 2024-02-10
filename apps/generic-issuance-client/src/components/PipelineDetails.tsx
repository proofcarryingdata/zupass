import {
  GenericIssuancePipelineListEntry,
  PipelineLoadSummary
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "../helpers/util";

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

export function pipelineIconFromStr(
  str: "starting" | "loaded" | "error" | "paused"
): ReactNode {
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

export function pipelineDetailPagePath(pipelineId: string): string {
  return `/pipelines/${pipelineId}`;
}

export function pipelineLink(pipelineId: string | undefined): ReactNode {
  if (!pipelineId) {
    return null;
  }

  return <Link to={pipelineDetailPagePath(pipelineId)}>EDIT</Link>;
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
