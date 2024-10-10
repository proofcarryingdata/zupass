import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import { PipelineLoadSummary } from "@pcd/passport-interface";
import { RollbarService } from "@pcd/server-shared";
import { Pool } from "postgres-pool";
import { sqlTransaction } from "../../../../database/sqlQuery";
import { logger } from "../../../../util/logger";
import { DiscordService } from "../../../discordService";
import { PagerDutyService } from "../../../pagerDutyService";
import { setError } from "../../../telemetryService";
import {
  traceLoadSummary,
  tracePipeline,
  traceUser
} from "../../honeycombQueries";
import { makePLogErr, makePLogInfo } from "../../pipelines/logging";
import { Pipeline } from "../../pipelines/types";
import { PipelineSlot } from "../../types";
import { PipelineSubservice } from "../PipelineSubservice";
import { UserSubservice } from "../UserSubservice";
import { maybeAlertForPipelineRun } from "./maybeAlertForPipelineRun";

const LOG_TAG = `[performPipelineLoad]`;

/**
 * Performs a {@link Pipeline#load} for the given {@link Pipeline}, and
 * performs all appropriate follow-up actions, like saving {@link PipelineAtom}s,
 * alerting, etc.
 */
export async function performPipelineLoad(
  pool: Pool,
  pipelineSlot: PipelineSlot,
  pipelineSubservice: PipelineSubservice,
  userSubservice: UserSubservice,
  discordService: DiscordService | null,
  pagerdutyService: PagerDutyService | null,
  rollbarService: RollbarService | null
): Promise<PipelineLoadSummary> {
  const startTime = new Date();
  const pipelineId = pipelineSlot.definition.id;
  const pipeline: Pipeline | undefined = pipelineSlot.instance;
  logger(
    LOG_TAG,
    `executing pipeline '${pipelineId}'` +
      ` of type '${pipeline?.type}'` +
      ` belonging to ${pipelineSlot.definition.ownerUserId}`
  );
  const owner = await sqlTransaction(pool, async (client) =>
    userSubservice.getUserById(client, pipelineSlot.definition.ownerUserId)
  );

  traceUser(owner);
  tracePipeline(pipelineSlot.definition);

  if (pipelineSlot.definition.options?.paused) {
    logger(
      LOG_TAG,
      `pipeline '${pipelineSlot.definition.id}' is paused, not loading`
    );
    const summary = {
      atomsLoaded: 0,
      lastRunEndTimestamp: new Date().toISOString(),
      lastRunStartTimestamp: new Date().toISOString(),
      latestLogs: [makePLogInfo("this pipeline is paused - not loading")],
      atomsExpected: 0,
      success: true
    };
    maybeAlertForPipelineRun(
      pipelineSlot,
      summary,
      pagerdutyService,
      discordService
    );
    return summary;
  }

  if (!pipeline) {
    logger(
      LOG_TAG,
      `pipeline '${pipelineId}' of type '${pipelineSlot.definition.type}'` +
        ` is not running; skipping execution`
    );
    const summary: PipelineLoadSummary = {
      lastRunStartTimestamp: startTime.toISOString(),
      lastRunEndTimestamp: new Date().toISOString(),
      latestLogs: [makePLogErr("failed to start pipeline")],
      atomsExpected: 0,
      atomsLoaded: 0,
      success: false,
      errorMessage: "failed to start pipeline"
    };
    await sqlTransaction(pool, (client) =>
      pipelineSubservice.saveLoadSummary(client, pipelineId, summary)
    );
    traceLoadSummary(summary);
    maybeAlertForPipelineRun(
      pipelineSlot,
      summary,
      pagerdutyService,
      discordService
    );
    return summary;
  }

  try {
    logger(
      LOG_TAG,
      `loading data for pipeline with id '${pipelineId}'` +
        ` of type '${pipelineSlot.definition.type}'`
    );
    const summary = await pipeline.load();
    logger(
      LOG_TAG,
      `successfully loaded data for pipeline with id '${pipelineId}'` +
        ` of type '${pipelineSlot.definition.type}'`
    );
    await sqlTransaction(pool, (client) =>
      pipelineSubservice.saveLoadSummary(client, pipelineId, summary)
    );
    traceLoadSummary(summary);
    maybeAlertForPipelineRun(
      pipelineSlot,
      summary,
      pagerdutyService,
      discordService
    );
    return summary;
  } catch (e) {
    rollbarService?.reportError(e);
    logger(LOG_TAG, `failed to load pipeline '${pipelineId}'`, e);
    setError(e, getActiveSpan());
    const summary = {
      lastRunStartTimestamp: startTime.toISOString(),
      lastRunEndTimestamp: new Date().toISOString(),
      latestLogs: [makePLogErr(`failed to load pipeline: ${e + ""}`)],
      atomsExpected: 0,
      atomsLoaded: 0,
      errorMessage: `failed to load pipeline\n${e}\n${
        e instanceof Error ? e.stack : ""
      }`,
      success: false
    } satisfies PipelineLoadSummary;
    await sqlTransaction(pool, (client) =>
      pipelineSubservice.saveLoadSummary(client, pipelineId, summary)
    );
    traceLoadSummary(summary);
    maybeAlertForPipelineRun(
      pipelineSlot,
      summary,
      pagerdutyService,
      discordService
    );
    return summary;
  }
}
