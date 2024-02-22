import { PipelineLog, PipelineLogLevel } from "@pcd/passport-interface";
import { matchesRegex } from "@pcd/util";

/**
 * Helper function to instantiate a {@link PipelineLog}, used to communicate
 * information from data loading of pipelines to users of Podbox.
 */
export function makePLog(
  level: PipelineLogLevel,
  log: string,
  metadata?: unknown
): PipelineLog {
  return {
    timestampCreated: new Date().toISOString(),
    level,
    value: log,
    metadata
  };
}

/**
 * Like {@link makePLog}, but specifically from {@link PipelineLogLevel.Info}.
 */
export function makePLogInfo(log: string, metadata?: unknown): PipelineLog {
  return {
    timestampCreated: new Date().toISOString(),
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
    timestampCreated: new Date().toISOString(),
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
    timestampCreated: new Date().toISOString(),
    level: PipelineLogLevel.Error,
    value: log,
    metadata
  };
}

export function getErrorLogs(
  logs?: PipelineLog[],
  ignoreRegexes?: string[]
): PipelineLog[] {
  return logs
    ? logs
        .filter((l) => l.level === PipelineLogLevel.Error)
        .filter((l) => !matchesRegex(l.value, ignoreRegexes))
    : [];
}

export function getWarningLogs(
  logs?: PipelineLog[],
  ignoreRegexes?: string[]
): PipelineLog[] {
  return logs
    ? logs
        .filter((l) => l.level === PipelineLogLevel.Warning)
        .filter((l) => !matchesRegex(l.value, ignoreRegexes))
    : [];
}
