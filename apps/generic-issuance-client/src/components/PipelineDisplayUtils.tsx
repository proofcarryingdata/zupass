import { Tag, TagLabel } from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  PipelineDefinition,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { BsTicketPerforatedFill } from "react-icons/bs";
import { FaCheck, FaHourglassHalf, FaRegPauseCircle } from "react-icons/fa";
import { FaFileCsv } from "react-icons/fa6";
import { GiCutLemon } from "react-icons/gi";
import { MdError } from "react-icons/md";
import { timeAgo } from "../helpers/util";
import { PipelineStateDisplay } from "../pages/dashboard/PipelineTable";
import { PodLink } from "./Core";

export function pipelineIconFromStr(str: PipelineStateDisplay): ReactNode {
  if (str === "Paused") {
    return <FaRegPauseCircle />;
  }

  if (str === "Starting") {
    return <FaHourglassHalf />;
  }

  if (str === "Loaded") {
    return <FaCheck />;
  }

  return <MdError />;
}

export function pipelineTypeIcon(type: PipelineType): ReactNode {
  const icon =
    type === PipelineType.CSV ? (
      <FaFileCsv />
    ) : type === PipelineType.Lemonade ? (
      <GiCutLemon />
    ) : (
      <BsTicketPerforatedFill />
    );

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
      <TagLabel>{type}</TagLabel>
      &nbsp;
      {pipelineTypeIcon(type)}
    </Tag>
  );
}
export function pipelineStatusStr(
  entry: GenericIssuancePipelineListEntry
): PipelineStateDisplay {
  return entry.pipeline.options?.paused
    ? "Paused"
    : !entry.extraInfo.lastLoad
    ? "Starting"
    : entry.extraInfo.lastLoad?.success
    ? "Loaded"
    : "Error";
}

export function PipelineStatusTag({
  status
}: {
  status?: PipelineStateDisplay;
}): ReactNode {
  if (!status) {
    return (
      <Tag style={smallerTagStyle}>
        <TagLabel>{status}</TagLabel>
      </Tag>
    );
  }
  return (
    <Tag style={smallerTagStyle}>
      <TagLabel>{status}</TagLabel>
      &nbsp;
      {pipelineIconFromStr(status)}
    </Tag>
  );
}

const tagStyle: React.CSSProperties = {
  width: "120px",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "4px"
};

const smallerTagStyle: React.CSSProperties = {
  ...tagStyle,
  width: "100px"
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
    return <span style={{ fontWeight: "bold" }}>{displayName}</span>;
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
