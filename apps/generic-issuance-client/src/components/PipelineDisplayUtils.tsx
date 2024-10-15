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
import { GiCutLemon, GiPeas } from "react-icons/gi";
import { MdError } from "react-icons/md";
import { timeAgo } from "../helpers/util";
import { PipelineStateDisplay } from "../pages/dashboard/PipelineTable";

export function pipelineStatusIconFromStr(
  str: PipelineStateDisplay
): ReactNode {
  switch (str) {
    case "Paused":
      return <FaRegPauseCircle />;
    case "Starting":
      return <FaHourglassHalf />;
    case "Loaded":
      return <FaCheck />;
    case "Error":
      return <MdError />;
    default:
      console.warn(`pipelineStatusIconFromStr invalid - '${str}'`);
      return null;
  }
}

export function pipelineStatusColorFromStr(str?: PipelineStateDisplay): string {
  switch (str) {
    case "Paused":
      return "gray";
    case "Starting":
      return "gray";
    case "Loaded":
      return "green";
    case "Error":
      return "red";
    default:
      console.warn(`pipelineStatusColorFromStr invalid - '${str}'`);
      return "gray";
  }
}

export function pipelineTypeColor(type?: PipelineType): string {
  switch (type) {
    case PipelineType.CSV:
      return "blue";
    case PipelineType.Lemonade:
      return "yellow";
    case PipelineType.Pretix:
      return "purple";
    case PipelineType.POD:
      return "teal";
    case PipelineType.CSVTicket:
      return "orange";
    default:
      // compile-time error for when not all cases are covered
      console.warn(`pipelineTypeColor invalid - '${type}'`);
      return "gray";
  }
}

export function pipelineTypeIcon(type: PipelineType): ReactNode {
  switch (type) {
    case PipelineType.CSV:
      return <FaFileCsv />;
    case PipelineType.Lemonade:
      return <GiCutLemon />;
    case PipelineType.Pretix:
      return <BsTicketPerforatedFill />;
    case PipelineType.POD:
      return <GiPeas />;
    case PipelineType.CSVTicket:
      return <FaFileCsv />;
    default:
      console.warn(`pipelineTypeIcon invalid - '${type}'`);
      return null;
  }
}

export function PipelineTypeTag({ type }: { type?: PipelineType }): ReactNode {
  if (!type) {
    return (
      <Tag style={tagStyle} colorScheme={pipelineTypeColor(type)}>
        <TagLabel>{type}</TagLabel>
      </Tag>
    );
  }

  return (
    <Tag style={tagStyle} colorScheme={pipelineTypeColor(type)}>
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
      <Tag
        style={smallerTagStyle}
        colorScheme={pipelineStatusColorFromStr(status)}
      >
        <TagLabel>{status}</TagLabel>
      </Tag>
    );
  }
  return (
    <Tag
      style={smallerTagStyle}
      colorScheme={pipelineStatusColorFromStr(status)}
    >
      <TagLabel>{status}</TagLabel>
      &nbsp;
      {pipelineStatusIconFromStr(status)}
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

export const NAME_CUTOFF_LENGTH = 36;
export const PLACEHOLDER_NAME = "<untitled>";

export function pipelineDisplayNameStr(pipeline?: PipelineDefinition): string {
  let name = pipeline?.options.name;

  if (!pipeline || !name) {
    return PLACEHOLDER_NAME;
  }

  if (pipeline?.options?.important) {
    name = "🌟 " + name;
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
    return <span style={{}}>{displayName}</span>;
  }

  return (
    <span style={{ opacity: 0.8, fontStyle: "italic" }}>{displayName}</span>
  );
}

export function pipelineDetailPagePath(pipelineId: string): string {
  return `/pipelines/${pipelineId}`;
}

export function timeAgoStr(dateStr: string | undefined): string {
  return dateStr ? timeAgo.format(new Date(dateStr), "twitter") : "n/a";
}

export function timeAgoStrLong(dateStr: string | undefined): string {
  return dateStr ? timeAgo.format(new Date(dateStr), "round") : "n/a";
}
