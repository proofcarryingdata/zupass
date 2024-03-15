import { PipelineCapability } from "./capabilities/types";

export interface ZuboxUser {
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
