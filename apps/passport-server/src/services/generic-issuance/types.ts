import { PipelineCapability } from "./capabilities/types";

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
