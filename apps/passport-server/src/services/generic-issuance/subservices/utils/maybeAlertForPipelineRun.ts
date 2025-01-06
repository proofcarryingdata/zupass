import { PipelineLoadSummary } from "@pcd/passport-interface";
import urljoin from "url-join";
import { DiscordService } from "../../../discordService";
import { PagerDutyService } from "../../../pagerDutyService";
import { getErrorLogs, getWarningLogs } from "../../pipelines/logging";
import { PipelineSlot } from "../../types";

const DISCORD_ALERT_TIMEOUT_MS = 60_000 * 10;

/**
 * To be called after a pipeline finishes loading (by {@link performPipelineLoad}),
 * either as part of the global pipeline loading schedule as implemented by
 * {@link PipelineExecutorSubservice}, or because the pipeline's definition was updated
 * by a {@link PipelineUser}.
 *
 * Alerts the appropriate channels depending on the result of the pipeline load.
 *
 * Pipelines can be configured to opt in or out of alerts via their {@link PipelineDefinition}.
 */
export async function maybeAlertForPipelineRun(
  slot: PipelineSlot,
  runInfo: PipelineLoadSummary,
  pagerdutyService: PagerDutyService | null,
  discordService: DiscordService | null
): Promise<void> {
  const podboxUrl = process.env.GENERIC_ISSUANCE_CLIENT_URL ?? "";
  const pipelineDisplayName = slot?.definition.options?.name ?? "untitled";
  const errorLogs = getErrorLogs(
    runInfo.latestLogs,
    slot.definition.options.alerts?.errorLogIgnoreRegexes
  );
  const warningLogs = getWarningLogs(
    runInfo.latestLogs,
    slot.definition.options.alerts?.warningLogIgnoreRegexes
  );
  const discordTagList = slot.definition.options.alerts?.discordTags
    ? " " +
      slot.definition.options.alerts?.discordTags
        .map((id) => `<@${id}>`)
        .join(" ") +
      " "
    : "";

  const pipelineUrl = urljoin(
    podboxUrl,
    `/#/`,
    "pipelines",
    slot.definition.id
  );

  let shouldAlert = false;
  const alertReasons: string[] = [];

  if (!runInfo.success) {
    shouldAlert = true;
    alertReasons.push("pipeline load error");
  }

  if (
    errorLogs.length >= 1 &&
    slot.definition.options.alerts?.alertOnLogErrors
  ) {
    shouldAlert = true;
    alertReasons.push(
      `pipeline has error logs\n: ${JSON.stringify(errorLogs, null, 2)}`
    );
  }

  if (
    warningLogs.length >= 1 &&
    slot.definition.options.alerts?.alertOnLogWarnings
  ) {
    shouldAlert = true;
    alertReasons.push(
      `pipeline has warning logs\n ${JSON.stringify(warningLogs, null, 2)}`
    );
  }

  if (
    runInfo.atomsLoaded !== runInfo.atomsExpected &&
    slot.definition.options.alerts?.alertOnAtomMismatch
  ) {
    shouldAlert = true;
    alertReasons.push(
      `pipeline atoms count ${runInfo.atomsLoaded} mismatches data count ${runInfo.atomsExpected}`
    );
  }

  const alertReason = alertReasons.join("\n\n").substring(0, 800);

  // in the if - send alert beginnings
  if (shouldAlert) {
    // pagerduty
    if (
      slot.definition.options.alerts?.loadIncidentPagePolicy &&
      slot.definition.options.alerts?.pagerduty
    ) {
      const incident = await pagerdutyService?.triggerIncident(
        `pipeline load error: '${pipelineDisplayName}'`,
        `${pipelineUrl}\n${alertReason}`,
        slot.definition.options.alerts?.loadIncidentPagePolicy,
        `pipeline-load-error-` + slot.definition.id
      );
      if (incident) {
        slot.loadIncidentId = incident.id;
      }
    }

    // discord
    if (slot.definition.options.alerts?.discordAlerts) {
      let shouldMessageDiscord = false;
      if (
        // haven't messaged yet
        !slot.lastLoadDiscordMsgTimestamp ||
        // messaged too recently
        (slot.lastLoadDiscordMsgTimestamp &&
          Date.now() >
            slot.lastLoadDiscordMsgTimestamp.getTime() +
              DISCORD_ALERT_TIMEOUT_MS)
      ) {
        slot.lastLoadDiscordMsgTimestamp = new Date();
        shouldMessageDiscord = true;
      }

      if (shouldMessageDiscord) {
        discordService?.sendAlert(
          `🚨   [Podbox](${podboxUrl}) Alert${discordTagList}- Pipeline [\`${pipelineDisplayName}\`](${pipelineUrl}) failed to load 😵\n` +
            `\`\`\`\n${alertReason}\`\`\`\n` +
            (runInfo.errorMessage
              ? `\`\`\`\n${runInfo.errorMessage}\n\`\`\``
              : ``)
        );
      }
    }
  }
  // send alert resolutions
  else {
    if (slot.definition.options.alerts?.discordAlerts) {
      if (slot.lastLoadDiscordMsgTimestamp) {
        discordService?.sendAlert(
          `✅   [Podbox](${podboxUrl}) Alert${discordTagList}- Pipeline [\`${pipelineDisplayName}\`](${pipelineUrl}) load error resolved`
        );
        slot.lastLoadDiscordMsgTimestamp = undefined;
      }
    }
    if (slot.loadIncidentId) {
      const incidentId = slot.loadIncidentId;
      slot.loadIncidentId = undefined;
      await pagerdutyService?.resolveIncident(incidentId);
    }
  }
}
