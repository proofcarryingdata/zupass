import { PipelineLoadSummary, PipelineType } from "@pcd/passport-interface";
import { BasePipelineCapability } from "../types";
import { CSVPipeline } from "./CSVPipeline/CSVPipeline";
import { CSVTicketPipeline } from "./CSVTicketPipeline/CSVTicketPipeline";
import { LemonadePipeline } from "./LemonadePipeline";
import { PODPipeline } from "./PODPipeline/PODPipeline";
import { PretixPipeline } from "./PretixPipeline";

/**
 * Each new type of {@link Pipeline} needs to be added to this type
 * declaration.
 */
export type Pipeline =
  | LemonadePipeline
  | PretixPipeline
  | CSVPipeline
  | CSVTicketPipeline
  | PODPipeline;

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

/**
 * Created when a user logs into Podbox via Stytch.
 */
export interface PipelineUser {
  id: string;
  email: string;
  isAdmin: boolean;
  timeCreated: Date;
  timeUpdated: Date;
}
