import { z } from "zod";

/**
 * Each new {@link Pipeline} type needs a corresponding entry in thie enum.
 */
export enum PipelineType {
  Lemonade = "Lemonade",
  Pretix = "Pretix",
  CSV = "CSV"
}

export enum IncidentPolicy {
  Everyone = "Everyone",
  JustIvan = "JustIvan",
  JustRichard = "JustRichard"
}

const BasePipelineDefinitionSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  editorUserIds: z.array(z.string().uuid()),
  timeCreated: z.string(),
  timeUpdated: z.string()
});

const AlertsOptionsSchema = z.object({
  pagerduty: z.boolean().optional(),
  loadIncidentPagePolicy: z.nativeEnum(IncidentPolicy).optional(),
  discordTags: z.array(z.string()).optional(),
  discordAlerts: z.boolean().optional(),
  alertOnLogErrors: z.boolean().optional(),
  errorLogIgnoreRegexes: z.array(z.string()).optional(),
  alertOnLogWarnings: z.boolean().optional(),
  warningLogIgnoreRegexes: z.array(z.string()).optional(),
  alertOnAtomMismatch: z.boolean().optional()
});

export type AlertsOptions = z.infer<typeof AlertsOptionsSchema>;

const BasePipelineOptionsSchema = z.object({
  /**
   * Paused pipelines don't load data, but their APIs are still
   * accessible and enabled.
   */
  paused: z.boolean().optional(),
  name: z.string().optional(),
  notes: z.string().optional(),
  alerts: AlertsOptionsSchema.optional(),
  /**
   * Protected pipelines can't be deleted.
   */
  protected: z.boolean().optional(),
  important: z.boolean().optional()
});

export type BasePipelineOptions = z.infer<typeof BasePipelineOptionsSchema>;

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

/**
 * Pipeline definitions can also include manually-added tickets. Pipelines that
 * support this will create tickets according to these specifications, in
 * addition to those loaded from their primary data source.
 */
const ManualTicketSchema = z.object({
  /**
   * The ID of the ticket.
   */
  id: z.string().uuid(),
  /**
   * The generic issuance UUID of the event that the ticket is for.
   */
  eventId: z.string().uuid(),
  /**
   * The generic issuance UUID for the product/ticket type.
   */
  productId: z.string().uuid(),
  /**
   * The email to assign the ticket to.
   */
  attendeeEmail: z.string().email(),
  /**
   * The full name of the attendee.
   */
  attendeeName: z.string().min(1)
});

const ManualTicketListSchema = z
  .array(ManualTicketSchema)
  .optional()
  .refine(
    (manualTickets) =>
      // If manualTickets is undefined then that's OK
      manualTickets === undefined ||
      // Otherwise make sure each one has a unique ID
      manualTickets.length ===
        new Set(manualTickets.map((manualTicket) => manualTicket.id)).size,
    { message: "Ticket IDs must be unique" }
  );

export type ManualTicket = z.infer<typeof ManualTicketSchema>;

const LemonadePipelineTicketTypeConfigSchema = z.object({
  /**
   * The ID of this ticket type on the Lemonade end.
   */
  externalId: z.string(),
  /**
   * The UUID of this ticket type used in {@link EdDSATicketPCD}.
   */
  genericIssuanceProductId: z.string().uuid(),
  /**
   * Whether this ticket type is allowed to check other tickets in or not.
   */
  isSuperUser: z.boolean(),
  /**
   * Display name
   */
  name: z.string()
});

const SemaphoreGroupConfigSchema = z.object({
  /**
   * Defines the set of event ID/product ID pairs that qualify a ticket-holder
   * for membership in this group. If no product ID is specified, then all
   * tickets for the event will qualify for group membership.
   *
   * The groupId is a UUID which the administrator should generate.
   */
  groupId: z.string().uuid(),
  name: z.string().min(1),
  memberCriteria: z.array(
    z.object({
      /**
       * generic issuance event id
       */
      eventId: z.string().uuid(),
      /**
       * generic issuance product id
       */
      productId: z.string().uuid().optional()
    })
  )
});

export type SemaphoreGroupConfig = z.infer<typeof SemaphoreGroupConfigSchema>;

const SemaphoreGroupListSchema = z
  .array(SemaphoreGroupConfigSchema)
  .optional()
  .refine(
    (groups) =>
      // Groups being undefined is valid
      groups === undefined ||
      // If groups are defined, the number of unique IDs must equal the
      // number of groups
      groups.length === new Set(groups.map((group) => group.groupId)).size,
    { message: "Semaphore group IDs must be unique" }
  )
  .refine(
    (groups) =>
      // Groups being undefined is valid
      groups === undefined ||
      // If groups are defined, the number of unique names must equal the
      // number of groups
      groups.length === new Set(groups.map((group) => group.name)).size,
    { message: "Semaphore group names must be unique" }
  );

/**
 * Generic Issuance-specific ticket type configuration - roughly corresponds to a
 * 'Product' in Pretix-land.
 */
export type LemonadePipelineTicketTypeConfig = z.infer<
  typeof LemonadePipelineTicketTypeConfigSchema
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
  ticketTypes: z.array(LemonadePipelineTicketTypeConfigSchema)
});

/**
 * Generic Issuance-specific event configuration. Should roughly match up to the
 * types defined above - {@link LemonadeTicket}, {@link LemonadeEvent}, and
 * {@link LemonadeTicketType}.
 */
export type LemonadePipelineEventConfig = z.infer<
  typeof LemonadePipelineEventConfigSchema
>;

export const ActionScreenConfigSchema = z.object({
  eventBannerUrl: z.string().optional(),
  eventNameConfig: z.string().optional()
});

export type ActionScreenConfig = z.infer<typeof ActionScreenConfigSchema>;

export const BadgeConfigSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  productName: z.string().optional(),
  imageUrl: z.string(),
  givers: z.array(z.string()).optional(),
  grantOnCheckin: z.boolean().optional(),
  maxPerDay: z.number().optional()
});

export type BadgeConfig = z.infer<typeof BadgeConfigSchema>;

export const BadgesConfigSchema = z.object({
  enabled: z.boolean().optional(),
  choices: z.array(BadgeConfigSchema).optional()
});

export type BadgesConfig = z.infer<typeof BadgesConfigSchema>;

export const ContactsConfigSchema = z.object({
  enabled: z.boolean().optional()
});

export type ContactsConfig = z.infer<typeof ContactsConfigSchema>;

/**
 * Configuration of actions Podbox enables subscribers of the same Pipeline
 * to perform on each other:
 * - checking in
 * - issuing 'badges'
 * - pushing a contact card to scanee's zupass
 * - potentially other actions, like throwing snowballs.
 */
const TicketActionsOptionsSchema = z.object({
  badges: BadgesConfigSchema.optional(),
  contacts: ContactsConfigSchema.optional(),
  screenConfig: ActionScreenConfigSchema.optional()
});

export type TicketActions = z.infer<typeof TicketActionsOptionsSchema>;

const FeedIssuanceOptionsSchema = z.object({
  feedId: z.string(),
  feedDisplayName: z.string(),
  feedDescription: z.string(),
  feedFolder: z.string()
});

export type FeedIssuanceOptions = z.infer<typeof FeedIssuanceOptionsSchema>;

const ImageOptionsSchema = z.object({
  imageUrl: z.string(),
  requireCheckedIn: z.boolean()
});

export type ImageOptions = z.infer<typeof ImageOptionsSchema>;

const LemonadePipelineOptionsSchema = BasePipelineOptionsSchema.extend({
  /**
   * Configured by the user when setting up Lemonade as a data source.
   */
  oauthAudience: z.string(),
  oauthClientId: z.string(),
  oauthClientSecret: z.string(),
  oauthServerUrl: z.string(),
  backendUrl: z.string(),
  events: z.array(LemonadePipelineEventConfigSchema),
  superuserEmails: z.array(z.string()).optional(),
  feedOptions: FeedIssuanceOptionsSchema,
  manualTickets: ManualTicketListSchema,
  ticketActions: TicketActionsOptionsSchema.optional(),
  semaphoreGroups: SemaphoreGroupListSchema,
  enablePODTickets: z.boolean().optional()
}).refine((val) => {
  // Validate that the manual tickets have event and product IDs that match the
  // event configuration.
  const events = new Map(
    val.events.map((ev) => [ev.genericIssuanceEventId, ev])
  );
  for (const manualTicket of val.manualTickets ?? []) {
    // Check that the event exists
    const manualTicketEvent = events.get(manualTicket.eventId);
    if (!manualTicketEvent) {
      return false;
    }
    // Check that the event has a product with the product ID on the ticket
    if (
      !manualTicketEvent.ticketTypes.find(
        (ticketType) =>
          ticketType.genericIssuanceProductId === manualTicket.productId
      )
    ) {
      return false;
    }
  }

  return true;
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

export function isLemonadePipelineDefinition(
  d: PipelineDefinition
): d is LemonadePipelineDefinition {
  return d.type === PipelineType.Lemonade;
}

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
  isSuperUser: z.boolean(),
  /**
   * If the attendee's name is collected by a question
   * other than the default attendee name question, this
   * field lets you configure Podbox to prefer to read
   * names from answers to the question with this `question_identifier`
   *
   * see pretix docs here: https://docs.pretix.eu/en/latest/api/resources/orders.html#order-position-resource
   */
  nameQuestionPretixQuestionIdentitifier: z.string().optional()
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
  /**
   * Options to configure displaying an image instead of the QR code
   */
  imageOptions: ImageOptionsSchema.optional(),
  products: z.array(PretixProductConfigSchema),
  /**
   * Skip validation of event settings - use with caution!
   */
  skipSettingsValidation: z.boolean().optional()
});

/**
 * Configuration for a specific event, which is managed under the organizer's
 * Pretix account.
 */
export type PretixEventConfig = z.infer<typeof PretixEventConfigSchema>;

const PretixPipelineOptionsSchema = BasePipelineOptionsSchema.extend({
  /**
   * This object represents a configuration from which the server can instantiate
   * a functioning {@link PretixPipeline}. Partially specified by the user.
   */
  pretixAPIKey: z.string(),
  pretixOrgUrl: z.string(),
  events: z.array(PretixEventConfigSchema),
  feedOptions: FeedIssuanceOptionsSchema,
  manualTickets: ManualTicketListSchema,
  semaphoreGroups: SemaphoreGroupListSchema,
  enablePODTickets: z.boolean().optional()
}).refine((val) => {
  // Validate that the manual tickets have event and product IDs that match the
  // event configuration.
  const events = new Map(val.events.map((ev) => [ev.genericIssuanceId, ev]));
  for (const manualTicket of val.manualTickets ?? []) {
    // Check that the event exists
    const manualTicketEvent = events.get(manualTicket.eventId);
    if (!manualTicketEvent) {
      return false;
    }
    // Check that the event has a product with the product ID on the ticket
    if (
      !manualTicketEvent.products.find(
        (product) => product.genericIssuanceId === manualTicket.productId
      )
    ) {
      return false;
    }
  }

  return true;
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

export function isPretixPipelineDefinition(
  d: PipelineDefinition
): d is PretixPipelineDefinition {
  return d.type === PipelineType.Pretix;
}

export enum CSVPipelineOutputType {
  /**
   * {@link EdDSAMessagePCD}
   */
  Message = "EdDSAMessage",
  Ticket = "EdDSATicket",
  PODTicket = "PODTicketPCD"
}

const CSVPipelineOptionsSchema = BasePipelineOptionsSchema.extend({
  csv: z.string(),
  outputType: z.nativeEnum(CSVPipelineOutputType).optional(),
  feedOptions: FeedIssuanceOptionsSchema,
  issueToUnmatchedEmail: z.boolean().optional()
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

export function isCSVPipelineDefinition(
  d: PipelineDefinition
): d is CSVPipelineDefinition {
  return d.type === PipelineType.CSV;
}

/**
 * This item is exported so that we can use it for validation on generic issuance server.
 */
export const PipelineDefinitionSchema = z.discriminatedUnion("type", [
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

const PipelineHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  pipeline: PipelineDefinitionSchema,
  timeCreated: z.string(),
  editorUserId: z.string().optional()
});

export type PipelineHistoryEntry = z.infer<typeof PipelineHistoryEntrySchema>;

export interface HydratedPipelineHistoryEntry extends PipelineHistoryEntry {
  editorEmail?: string;
}

/**
 * {@link Pipeline}s offer PCDs to users via authenticated channels such as
 * feeds. When a user authenticates in order to receive a PCD, we record this
 * in the DB, allowing us to reconstruct a list of authenticated users for
 * purposes such as Semaphore group management.
 */
export interface PipelineConsumer {
  email: string; // the consumer's email address
  commitment: string; // the consumer's semaphore commitment
  timeCreated: Date;
  timeUpdated: Date;
}
