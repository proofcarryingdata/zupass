import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import {
  PipelineDefinition,
  PipelineLoadSummary
} from "@pcd/passport-interface";
import { traceFlattenedObject } from "../telemetryService";
import { PipelineUser } from "./pipelines/types";

/**
 * Honeycomb query that displays pipeline executions for a given pipeline.
 */
export function getPipelineLoadHQuery(pipelineID: string): object {
  return {
    time_range: 3600,
    granularity: 0,
    breakdowns: [
      "trace_method_name",
      "pipeline.type",
      "pipeline.id",
      "error_msg"
    ],
    calculations: [
      { op: "COUNT" },
      { op: "AVG", column: "duration_ms" },
      { op: "MAX", column: "pipeline_load_summary.atoms_loaded" }
    ],
    filters: [
      {
        column: "name",
        op: "=",
        value: "GENERIC_ISSUANCE.performPipelineLoad"
      },
      {
        column: "pipeline.id",
        op: "=",
        value: pipelineID
      }
    ],
    filter_combination: "AND",
    orders: [{ op: "COUNT", order: "descending" }],
    havings: [],
    limit: 1000
  };
}

/**
 * Honeycomb query that displays pipeline executions for a given pipeline.
 */
export function getPipelineAllHQuery(pipelineID: string): object {
  return {
    time_range: 3600,
    granularity: 0,
    breakdowns: ["name", "pipeline.type", "pipeline.id", "error_msg"],
    calculations: [{ op: "COUNT" }, { op: "AVG", column: "duration_ms" }],
    filters: [
      {
        column: "pipeline.id",
        op: "=",
        value: pipelineID
      }
    ],
    filter_combination: "AND",
    orders: [{ op: "COUNT", order: "descending" }],
    havings: [],
    limit: 1000
  };
}

export function traceUser(user: PipelineUser | undefined): void {
  traceFlattenedObject(getActiveSpan(), { user });
}

export function tracePipeline(pipeline: PipelineDefinition | undefined): void {
  traceFlattenedObject(getActiveSpan(), {
    pipeline: {
      id: pipeline?.id,
      type: pipeline?.type,
      owner_id: pipeline?.ownerUserId
    }
  });
}

export function traceLoadSummary(info: PipelineLoadSummary | undefined): void {
  traceFlattenedObject(getActiveSpan(), {
    pipeline_load_summary: {
      atoms_loaded: info?.atomsLoaded,
      success: info?.success,
      log_length: info?.latestLogs?.length
    }
  });
}
