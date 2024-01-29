import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";

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
 * A {@link LemonadePipelineDefinition} is a pipeline that has finished being
 * set up that configures the generic issuance service to load data on behalf
 * of a particular user from Lemonade and issue tickets for it.
 */
export interface LemonadePipelineDefinition extends BasePipelineDefinition {
  type: PipelineType.Lemonade;
  options: LemonadePipelineOptions;
}

export function isLemonadePipelineDefinition(
  d: PipelineDefinition
): d is LemonadePipelineDefinition {
  return d.type === PipelineType.Lemonade;
}

/**
 * Similar to {@link LemonadePipelineDefinition} but for Pretix-based Pipelines.
 */
export interface PretixPipelineDefinition extends BasePipelineDefinition {
  type: PipelineType.Pretix;
  options: PretixPipelineOptions;
}

export function isPretixPipelineDefinition(
  d: PipelineDefinition
): d is PretixPipelineDefinition {
  return d.type === PipelineType.Pretix;
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
 * TODO: finalize this
 */
export interface LemonadePipelineOptions {
  lemonadeApiKey: string;
  events: LemonadeEventConfig[];
}

/**
 * Generic Issuance-specific event configuration. Should roughly match up to the
 * types defined above - {@link LemonadeTicket}, {@link LemonadeEvent}, and
 * {@link LemonadeTicketTier}.
 */
export interface LemonadeEventConfig {
  id: string;
  name: string;
  ticketTierIds: string[];
}

/**
 * TODO: this needs to take into account the actual {@link PretixPipeline}, which
 * has not been implemented yet.
 */
export interface PretixPipelineOptions {
  pretixAPIKey: string;
  pretixOrgUrl: string;
  events: PretixEventConfig[];
}

/**
 * This object represents a configuration from which the server can instantiate
 * a functioning {@link PretixPipeline}. It's entirely specified by the user.
 *
 * TODO:
 * - how do these map to product and event ids?
 */
export interface PretixEventConfig {
  id: string;
  name: string;
  productIds: string[];
  superUserProductIds: string[];
}

/**
 * Each new {@link Pipeline} type needs a corresponding entry in thie enum.
 */
export enum PipelineType {
  Lemonade = "Lemonade",
  Pretix = "Pretix"
}

/**
 * {@link Pipeline}s store the data they load from their data providers in our
 * database. The fundamental unit of storage is a {@link PipelineAtom}. Each new
 * type of {@link Pipeline} should define a subtype of this interface to further
 * specify the data that it stores.
 *
 * TODO:
 * - what metadata should be stored per atom? pipeline name? timetamps?
 */
export interface PipelineAtom {
  id: string; // unique per pipeline configuration
}

/**
 * {@link Pipeline}s can have external-facing APIs. Anything that an external
 * user can do with a Pipeline needs to be represented as a {@link PipelineCapability}.
 */
export enum PipelineCapability {
  FeedIssuanceCapability = "FeedIssuanceCapability",
  CheckinCapability = "CheckinCapability"
}

/**
 * All {@link PipelineCapability}s are derived from this type.
 */
export interface BasePipelineCapability {
  type: PipelineCapability;
  urlPath?: string; // set dynamically during application initialization
}

/**
 * Can be attached to a {@link Pipeline} that can issue feeds to external
 * users. The server can make use of the information encoded in this Capability
 * to connect it to the other services - express routing, etc.
 */
export interface FeedIssuanceCapability extends BasePipelineCapability {
  type: PipelineCapability.FeedIssuanceCapability;
  /**
   * Used to differentiate between different feeds on the same {@link Pipeline}.
   * TODO:
   * - ensure at runtime that a {@link Pipeline} doesn't contain capabilities
   *   with overlapping {@link subId}s.
   */
  subId: string;
  issue(credential: SerializedPCD): Promise<PollFeedResponseValue>;
}

export function isFeedIssuanceCapability(
  capability: BasePipelineCapability
): capability is FeedIssuanceCapability {
  return capability.type === PipelineCapability.FeedIssuanceCapability;
}

/**
 * Similar to {@link FeedIssuanceCapability} except used to declare the capability
 * of a feed to respond to check in requests.
 */
export interface CheckinCapability extends BasePipelineCapability {
  type: PipelineCapability.CheckinCapability;
  checkin(request: CheckTicketInRequest): Promise<CheckTicketInResponseValue>;
}

export function isCheckinCapability(
  capability: BasePipelineCapability
): capability is CheckinCapability {
  return capability.type === PipelineCapability.CheckinCapability;
}

/**
 * Interface from which all {@link Pipeline}s derive.
 */
export interface BasePipeline {
  type: PipelineType;
  capabilities: readonly BasePipelineCapability[];
}

/**
 * Intermediate representation which the {@link LemonadePipeline} uses to
 * save tickets, in order to be able to issue tickets based on them later on.
 */
export interface LemonadeAtom extends PipelineAtom {
  // todo
}
