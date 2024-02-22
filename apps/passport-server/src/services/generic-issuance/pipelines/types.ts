import {
  PipelineDefinition,
  PipelineLoadSummary,
  PipelineType
} from "@pcd/passport-interface";
import { BasePipelineCapability } from "../types";
import { CSVPipeline } from "./CSVPipeline/CSVPipeline";
import { LemonadePipeline } from "./LemonadePipeline";
import { PretixPipeline } from "./PretixPipeline";

/**
 * Each new type of {@link Pipeline} needs to be added to this type
 * declaration.
 */
export type Pipeline = LemonadePipeline | PretixPipeline | CSVPipeline;

/**
 * Interface from which all {@link Pipeline}s derive.
 */
export interface BasePipeline {
  type: PipelineType;
  capabilities: readonly BasePipelineCapability[];
  load(): Promise<PipelineLoadSummary>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface PipelineUser {
  id: string;
  email: string;
  isAdmin: boolean;
  timeCreated: Date;
  timeUpdated: Date;
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
}
