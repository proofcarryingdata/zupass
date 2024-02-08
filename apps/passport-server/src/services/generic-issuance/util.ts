import { PipelineLog, PipelineLogLevel } from "@pcd/passport-interface";

/**
 * Helper function to instantiate a {@link PipelineLog}, used to communicate
 * information from data loading of pipelines to users of Podbox.
 */
export function makePLog(
  level: PipelineLogLevel,
  log: string,
  metadata?: unknown
): PipelineLog {
  return { timestampCreated: Date.now(), level, value: log, metadata };
}

/**
 * Like {@link makePLog}, but specifically from {@link PipelineLogLevel.Info}.
 */
export function makePLogInfo(log: string, metadata?: unknown): PipelineLog {
  return {
    timestampCreated: Date.now(),
    level: PipelineLogLevel.Info,
    value: log,
    metadata
  };
}

/**
 * Like {@link makePLog}, but specifically from {@link PipelineLogLevel.Warning}.
 */
export function makePLogWarn(log: string, metadata?: unknown): PipelineLog {
  return {
    timestampCreated: Date.now(),
    level: PipelineLogLevel.Warning,
    value: log,
    metadata
  };
}

/**
 * Like {@link makePLog}, but specifically from {@link PipelineLogLevel.Error}.
 */
export function makePLogErr(log: string, metadata?: unknown): PipelineLog {
  return {
    timestampCreated: Date.now(),
    level: PipelineLogLevel.Error,
    value: log,
    metadata
  };
}
