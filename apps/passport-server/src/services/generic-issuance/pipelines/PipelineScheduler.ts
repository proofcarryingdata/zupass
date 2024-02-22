import { PipelineDefinition } from "@pcd/passport-interface";
import { Pipeline, PipelineUser } from "./types";

/**
 * It's not always possible to start a {@link Pipeline} given a {@link PipelineDefinition}
 * because a pipeline could be misconfigured.
 *
 * An {@link PipelineSlot} is used to represent a pair of {@link PipelineDefinition} and
 * its corresponding {@link Pipeline} if one was able to be started.
 */
export interface PipelineSlot {
  definition: PipelineDefinition;

  // runtime information - intentionally ephemeral
  instance?: Pipeline;
  owner?: PipelineUser;
  loadIncidentId?: string;
  lastLoadDiscordMsgTimestamp?: Date;
}

export class PipelineScheduler {}
