import { PipelineLoadSummary, PipelineType } from "@pcd/passport-interface";
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
  stop(): Promise<void>;
}

export interface PipelineUser {
  id: string;
  email: string;
  isAdmin: boolean;
  timeCreated: Date;
  timeUpdated: Date;
}
