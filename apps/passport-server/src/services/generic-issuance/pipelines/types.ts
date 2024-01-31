import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import { BasePipelineCapability } from "../types";
import {
  LemonadePipeline,
  LemonadePipelineDefinition
} from "./LemonadePipeline";
import { PretixPipeline, PretixPipelineDefinition } from "./PretixPipeline";

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
  load(): Promise<void>; // TODO: is this right?
  issue(credential: SerializedPCD<SemaphoreSignaturePCD>): Promise<PCD[]>;
}

/**
 * Each new {@link Pipeline} type needs a corresponding entry in thie enum.
 */
export enum PipelineType {
  Lemonade = "Lemonade",
  Pretix = "Pretix"
}

/**
 * A pipeline definition is owned by the user who set it up. It's the
 * persisted representation of a pipeline on our backend. When a user
 * sets up a pipeline via the generic issuance UI, they are creating one
 * of these over a series of configuration steps - choosing which data
 * source to use, uploading an API key, selecting which data to load, etc.
 *
 * TODO:
 * - sql migration to create a table to store these things. Probably
 *   something like a 2-column table. One column for JSON representing
 *   the pipeline definition, and a unique id column derived from the JSON.
 */
export interface BasePipelineDefinition {
  id: string;
  ownerUserId: string;
  editorUserIds: string[];
}

/**
 * Any new pipeline definitions need to be added to this type declaration. Note
 * that the way I've set it up a {@link Pipeline} appears to only be able to have
 * one data source. However, that is not the case. In the future, if needed, it
 * would be possible to create Pipelines that load from an arbitrary quantity
 * of data sources.
 */
export type PipelineDefinition =
  | LemonadePipelineDefinition
  | PretixPipelineDefinition;

/**
 * TODO - should be a database entry
 */
export interface PipelineUser {
  id: string;
  email: string;
  isAdmin: boolean;
}
