import { PipelineDefinition } from "@pcd/passport-interface";
import { PipelineCapability } from "./capabilities/types";
import { Pipeline, PipelineUser } from "./pipelines/types";

/**
 * TODO:
 * - this probably needs some more columns for login purposes
 * - create migration sql
 */
export interface GenericIssuanceUser {
  id: string;
  email: string;
  timeCreated: Date;
  timeUpdated: Date;
  isAdmin: boolean;
}

/**
 * All {@link PipelineCapability}s are derived from this type.
 */
export interface BasePipelineCapability {
  type: PipelineCapability;
  urlPath?: string; // set dynamically during application initialization
}

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
  loading: boolean;
}
