import { PipelineLog, PipelineLogLevel } from "@pcd/passport-interface";

export function makePLog(
  level: PipelineLogLevel,
  log: string,
  metadata?: unknown
): PipelineLog {
  return { timestampCreated: Date.now(), level, value: log, metadata };
}

export function makePLogInfo(log: string, metadata?: unknown): PipelineLog {
  return {
    timestampCreated: Date.now(),
    level: PipelineLogLevel.Info,
    value: log,
    metadata
  };
}

export function makePLogWarn(log: string, metadata?: unknown): PipelineLog {
  return {
    timestampCreated: Date.now(),
    level: PipelineLogLevel.Warning,
    value: log,
    metadata
  };
}

export function makePLogErr(log: string, metadata?: unknown): PipelineLog {
  return {
    timestampCreated: Date.now(),
    level: PipelineLogLevel.Error,
    value: log,
    metadata
  };
}
