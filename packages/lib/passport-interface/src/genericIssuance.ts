// TODO: Add shared pipeline types here

import { z } from "zod";

/**
 * A pipeline definition is owned by the user who set it up. It's the
 * persisted representation of a pipeline on our backend. When a user
 * sets up a pipeline via the generic issuance UI, they are creating one
 * of these over a series of configuration steps - choosing which data
 * source to use, uploading an API key, selecting which data to load, etc.
 */
export const BasePipelineDefinitionSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  editorUserIds: z.string().uuid().array(),
  type: z.string(),
  options: z.any()
});

export type BasePipelineDefinition = z.infer<
  typeof BasePipelineDefinitionSchema
>;

/**
 * Each new {@link Pipeline} type needs a corresponding entry in thie enum.
 */
export enum PipelineType {
  Lemonade = "Lemonade",
  Pretix = "Pretix"
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

/**
 * Configured by the user when setting up Lemonade as a data source.
 */
export interface LemonadePipelineOptions {
  lemonadeApiKey: string;
  events: LemonadePipelineEventConfig[];
}

/**
 * Generic Issuance-specific event configuration. Should roughly match up to the
 * types defined above - {@link LemonadeTicket}, {@link LemonadeEvent}, and
 * {@link LemonadeTicketTier}.
 */
export interface LemonadePipelineEventConfig {
  /**
   * The ID of this event on the Lemonade end.
   */
  externalId: string;

  /**
   * Display name.
   */
  name: string;

  /**
   * The UUID of this event used for {@link EdDSATicketPCD}.
   */
  genericIssuanceEventId: string;

  /**
   * Roughly translates to Products in {@link EdDSATicketPCD}.
   */
  ticketTiers: LemonadePipelineTicketTierConfig[];
}

/**
 * Generic Issuance-specific ticket tier configuration - roughly corresponds to a
 * 'Product' in Pretix-land.
 */
export interface LemonadePipelineTicketTierConfig {
  /**
   * The ID of this ticket tier on the Lemonade end.
   */
  externalId: string;

  /**
   * The UUID of this ticket tier used in {@link EdDSATicketPCD}.
   */
  genericIssuanceProductId: string;

  /**
   * Whether this ticket tier is allowed to check other tickets in or not.
   */
  isSuperUser: boolean;
}

/**
 * Similar to {@link LemonadePipelineDefinition} but for Pretix-based Pipelines.
 */
export interface PretixPipelineDefinition extends BasePipelineDefinition {
  type: PipelineType.Pretix;
  options: PretixPipelineOptions;
}

/**
 * This object represents a configuration from which the server can instantiate
 * a functioning {@link PretixPipeline}. Partially specified by the user.
 */
export interface PretixPipelineOptions {
  pretixAPIKey: string;
  pretixOrgUrl: string;
  events: PretixEventConfig[];
}

/**
 * Configuration for a specific event, which is managed under the organizer's
 * Pretix account.
 */
export interface PretixEventConfig {
  externalId: string; // Pretix's event ID
  genericIssuanceId: string; // Our UUID
  name: string; // Display name for the event
  products: PretixProductConfig[];
}

/**
 * Configuration for specific products available for the event. Does not need
 * to include all products available in Pretix, but any product listed here
 * must be available in Pretix.
 */
export interface PretixProductConfig {
  externalId: string; // Pretix's item ID
  genericIssuanceId: string; // Our UUID
  name: string; // Display name
  isSuperUser: boolean; // Is a user with this product a "superuser"?
  // Superusers are able to check tickets in to events.
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
