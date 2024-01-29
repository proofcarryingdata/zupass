import { BasePipelineCapability, PipelineType } from "../types";
import { LemonadePipeline } from "./LemonadePipeline";
import { PretixPipeline } from "./PretixPipeline";

/**
 * Each new type of {@link Pipeline} needs to be added to this type
 * declaration.
 */
export type Pipeline = LemonadePipeline | PretixPipeline;

/**
 * Interface from which all {@link Pipeline}s derive.
 */
export interface BasePipeline {
  type: PipelineType;
  capabilities: readonly BasePipelineCapability[];
}
