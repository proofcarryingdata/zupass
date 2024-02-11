import { Tag, TagLabel } from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  PipelineDefinition,
  PipelineLoadSummary,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { timeAgo } from "../helpers/util";
import { PipelineStateDisplay } from "../pages/dashboard/PipelineTable";
import { PodLink } from "./Core";

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

export function pipelineStatusIcon(
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

export function pipelineTypeIcon(type: PipelineType): ReactNode {
  const icon =
    type === PipelineType.CSV
      ? "🗒️"
      : type === PipelineType.Lemonade
      ? "🍋"
      : "🎟️";

  return icon;
}

export function PipelineTypeTag({ type }: { type?: PipelineType }): ReactNode {
  if (!type) {
    return (
      <Tag style={tagStyle}>
        <TagLabel>{type}</TagLabel>
      </Tag>
    );
  }

  return (
    <Tag style={tagStyle}>
      {pipelineTypeIcon(type)}
      &nbsp;
      <TagLabel>{type}</TagLabel>
    </Tag>
  );
}

export function PipelineStatusTag({
  status
}: {
  status?: PipelineStateDisplay;
}): ReactNode {
  if (!status) {
    return (
      <Tag style={tagStyle}>
        <TagLabel>{status}</TagLabel>
      </Tag>
    );
  }
  return (
    <Tag style={tagStyle}>
      {pipelineIconFromStr(status)}&nbsp;
      <TagLabel>{status}</TagLabel>
    </Tag>
  );
}

const tagStyle = {
  width: "120px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "4px"
};

export const NAME_CUTOFF_LENGTH = 24;
export const PLACEHOLDER_NAME = "<untitled>";

export function pipelineDisplayNameStr(pipeline?: PipelineDefinition): string {
  const name = pipeline?.options.name;

  if (!pipeline || !name) {
    return PLACEHOLDER_NAME;
  }

  if (name.length > NAME_CUTOFF_LENGTH) {
    return name.substring(0, NAME_CUTOFF_LENGTH - 3) + "...";
  }

  return name;
}

export function PipelineDisplayNameText({
  pipeline
}: {
  pipeline?: PipelineDefinition;
}): ReactNode {
  const displayName = pipelineDisplayNameStr(pipeline);
  const hasName = !!pipeline?.options?.name;

  if (hasName) {
    return <span>{displayName}</span>;
  }

  return (
    <span style={{ opacity: 0.8, fontStyle: "italic" }}>{displayName}</span>
  );
}

export function pipelineDetailPagePath(pipelineId: string): string {
  return `/pipelines/${pipelineId}`;
}

export function pipelineLink(pipelineId: string | undefined): ReactNode {
  if (!pipelineId) {
    return null;
  }

  return <PodLink to={pipelineDetailPagePath(pipelineId)}>edit</PodLink>;
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

export function pipelineCreatedAtStr(dateStr: string): string {
  return timeAgo.format(new Date(dateStr), "twitter");
}

export function pipelineLastEditStr(dateStr: string): string {
  return timeAgo.format(new Date(dateStr), "twitter");
}

export function pipelineLastLoadStr(dateStr: string | undefined): string {
  return dateStr ? timeAgo.format(new Date(dateStr), "twitter") : "n/a";
}
