// TODO: Add shared pipeline types here

import { z } from "zod";

/**
 * Each new {@link Pipeline} type needs a corresponding entry in thie enum.
 */
export enum PipelineType {
  Lemonade = "Lemonade",
  Pretix = "Pretix",
  CSV = "CSV"
}

const BasePipelineDefinitionSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  editorUserIds: z.array(z.string().uuid()),
  timeCreated: z.string(),
  timeUpdated: z.string()
});

/**
 * A pipeline definition is owned by the user who set it up. It's the
 * persisted representation of a pipeline on our backend. When a user
 * sets up a pipeline via the generic issuance UI, they are creating one
 * of these over a series of configuration steps - choosing which data
 * source to use, uploading an API key, selecting which data to load, etc.
 */
export type BasePipelineDefinition = z.infer<
  typeof BasePipelineDefinitionSchema
>;

const LemonadePipelineTicketTierConfigSchema = z.object({
  /**
   * The ID of this ticket tier on the Lemonade end.
   */
  externalId: z.string(),
  /**
   * The UUID of this ticket tier used in {@link EdDSATicketPCD}.
   */
  genericIssuanceProductId: z.string().uuid(),
  /**
   * Whether this ticket tier is allowed to check other tickets in or not.
   */
  isSuperUser: z.boolean()
});

/**
 * Generic Issuance-specific ticket tier configuration - roughly corresponds to a
 * 'Product' in Pretix-land.
 */
export type LemonadePipelineTicketTierConfig = z.infer<
  typeof LemonadePipelineTicketTierConfigSchema
>;

const LemonadePipelineEventConfigSchema = z.object({
  /**
   * The ID of this event on the Lemonade end.
   */
  externalId: z.string(),
  /**
   * Display name.
   */
  name: z.string(),
  /**
   * The UUID of this event used for {@link EdDSATicketPCD}.
   */
  genericIssuanceEventId: z.string().uuid(),
  /**
   * Roughly translates to Products in {@link EdDSATicketPCD}.
   */
  ticketTiers: z.array(LemonadePipelineTicketTierConfigSchema)
});

/**
 * Generic Issuance-specific event configuration. Should roughly match up to the
 * types defined above - {@link LemonadeTicket}, {@link LemonadeEvent}, and
 * {@link LemonadeTicketTier}.
 */
export type LemonadePipelineEventConfig = z.infer<
  typeof LemonadePipelineEventConfigSchema
>;

const FeedIssuanceOptionsSchema = z.object({
  feedId: z.string(),
  feedDisplayName: z.string(),
  feedDescription: z.string(),
  feedFolder: z.string()
});

export type FeedIssuanceOptions = z.infer<typeof FeedIssuanceOptionsSchema>;

const LemonadePipelineOptionsSchema = z.object({
  /**
   * Configured by the user when setting up Lemonade as a data source.
   */
  oauthAudience: z.string(),
  oauthClientId: z.string(),
  oauthClientSecret: z.string(),
  oauthServerUrl: z.string(),
  backendUrl: z.string(),
  events: z.array(LemonadePipelineEventConfigSchema),
  feedOptions: FeedIssuanceOptionsSchema
});

export type LemonadePipelineOptions = z.infer<
  typeof LemonadePipelineOptionsSchema
>;

const LemonadePipelineDefinitionSchema = BasePipelineDefinitionSchema.extend({
  type: z.literal(PipelineType.Lemonade),
  options: LemonadePipelineOptionsSchema
});

/**
 * A {@link LemonadePipelineDefinition} is a pipeline that has finished being
 * set up that configures the generic issuance service to load data on behalf
 * of a particular user from Lemonade and issue tickets for it.
 */
export type LemonadePipelineDefinition = z.infer<
  typeof LemonadePipelineDefinitionSchema
>;

const PretixProductConfigSchema = z.object({
  /**
   * Pretix's item ID
   */
  externalId: z.string(),
  /**
   * Our UUID
   */
  genericIssuanceId: z.string().uuid(),
  /**
   * Display name
   */
  name: z.string(),
  /**
   * Is a user with this product a "superuser"?
   * Superusers are able to check tickets in to events.
   */
  isSuperUser: z.boolean()
});

/**
 * Configuration for specific products available for the event. Does not need
 * to include all products available in Pretix, but any product listed here
 * must be available in Pretix.
 */
export type PretixProductConfig = z.infer<typeof PretixProductConfigSchema>;

const PretixEventConfigSchema = z.object({
  /**
   * Pretix's event ID
   */
  externalId: z.string(),
  /**
   * Our UUID
   */
  genericIssuanceId: z.string().uuid(),
  /**
   * Display name for the event
   */
  name: z.string(),
  products: z.array(PretixProductConfigSchema)
});

/**
 * Configuration for a specific event, which is managed under the organizer's
 * Pretix account.
 */
export type PretixEventConfig = z.infer<typeof PretixEventConfigSchema>;

const PretixPipelineOptionsSchema = z.object({
  /**
   * This object represents a configuration from which the server can instantiate
   * a functioning {@link PretixPipeline}. Partially specified by the user.
   */
  pretixAPIKey: z.string(),
  pretixOrgUrl: z.string(),
  events: z.array(PretixEventConfigSchema),
  feedOptions: FeedIssuanceOptionsSchema
});

export type PretixPipelineOptions = z.infer<typeof PretixPipelineOptionsSchema>;

const PretixPipelineDefinitionSchema = BasePipelineDefinitionSchema.extend({
  type: z.literal(PipelineType.Pretix),
  options: PretixPipelineOptionsSchema
});

/**
 * Similar to {@link LemonadePipelineDefinition} but for Pretix-based Pipelines.
 */
export type PretixPipelineDefinition = z.infer<
  typeof PretixPipelineDefinitionSchema
>;

const CSVPipelineOptionsSchema = z.object({
  csv: z.string(),
  feedOptions: FeedIssuanceOptionsSchema
});

export type CSVPipelineOptions = z.infer<typeof CSVPipelineOptionsSchema>;

const CSVPipelineDefinitionSchema = BasePipelineDefinitionSchema.extend({
  type: z.literal(PipelineType.CSV),
  options: CSVPipelineOptionsSchema
});

/**
 * Similar to {@link LemonadePipelineDefinition} but for CSV-based Pipelines.
 */
export type CSVPipelineDefinition = z.infer<typeof CSVPipelineDefinitionSchema>;

/**
 * This item is exported so that we can use it for validation on generic issuance server.
 */
export const PipelineDefinitionSchema = z.union([
  LemonadePipelineDefinitionSchema,
  PretixPipelineDefinitionSchema,
  CSVPipelineDefinitionSchema
]);

/**
 * Any new pipeline definitions need to be added to this type declaration. Note
 * that the way I've set it up a {@link Pipeline} appears to only be able to have
 * one data source. However, that is not the case. In the future, if needed, it
 * would be possible to create Pipelines that load from an arbitrary quantity
 * of data sources.
 */
export type PipelineDefinition = z.infer<typeof PipelineDefinitionSchema>;
