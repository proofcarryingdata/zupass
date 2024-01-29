import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { Router } from "express";
import _ from "lodash";
import { logger } from "../util/logger";

/**
 * A lemonade ticket as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 *
 * TODO:
 * - probably move to different file
 */
export interface LemonadeTicket {
  id: string;
  name: string;
  email: string;
  eventId: string;
  tierId: string;
  checkedIn: boolean;
}

/**
 * A lemonade ticket tier as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 *
 * TODO:
 * - probably move to different file
 */
export interface LemonadeTicketTier {
  name: string;
  id: string;
}

/**
 * A lemonade event as represented by the upcoming Lemonade API. It's
 * still t.b.d so this is my best guess for now.
 *
 * TODO:
 * - probably move to different file
 */
export interface LemonadeEvent {
  id: string;
  name: string;
  tickets: LemonadeTicket[];
  tiers: LemonadeTicketTier[];
  permissionedUserIds: string[];
}

/**
 * TODO:
 * - probably move to different file
 */
export interface ILemonadeAPI {
  loadEvents(apiKey: string): Promise<LemonadeEvent[]>;
  checkinTicket(
    apiKey: string,
    eventId: string,
    ticketId: string
  ): Promise<void>;
  // TODO: fill in the other methods. This is what Richard
  // has communicated to them:
  // - API Key scoped to an ‘account’, which has read/write permissions to the appropriate events. E.g. can read/write events that are owned/co-owned by the account.
  // - GET product types for a given event
  // - GET tickets for a given event, which will include
  //     - Attendee name
  //     - Attendee email
  //     - Product type (7-day, early bird, GA, etc)
  //     - Checked-in status
  // - POST Check-in (and potentially check-out)
}

export interface LemonadeUser {
  id: string;
  email: string;
  apiKey: string;
  name: string;
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
 * A place for the {@link PipelineAtom}s to be persisted.
 *
 * TODO:
 * - sql migration instantiating a table for these.
 * - what other functions should we have here? in the case that a
 *   pipeline has a LOT of data, there should probably be some cursor-based
 *   api that streams atoms.
 * - Other than atoms, what else should the {@link PipelineAtomDB} be able
 *   to store for feeds?
 */
export interface PipelineAtomDB {
  save(pipelineID: string, atoms: PipelineAtom[]): Promise<void>;
  load(pipelineID: string): Promise<PipelineAtom[]>;
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

/**
 * Class encapsulating the complete set of behaviors that a {@link Pipeline} which
 * loads data from Lemonade is capable of.
 */
export class LemonadePipeline implements BasePipeline {
  public type = PipelineType.Lemonade;
  public capabilities = [
    {
      issue: this.issueLemonadeTicketPCD.bind(this),
      subId: "ticket-feed",
      type: PipelineCapability.FeedIssuanceCapability
    } satisfies FeedIssuanceCapability,
    {
      checkin: this.checkinLemonadeTicketPCD.bind(this),
      type: PipelineCapability.CheckinCapability
    } satisfies CheckinCapability
  ];

  private definition: LemonadePipelineDefinition;
  private db: PipelineAtomDB;
  private api: ILemonadeAPI;

  public get id(): string {
    return this.definition.id;
  }

  public constructor(
    definition: LemonadePipelineDefinition,
    db: PipelineAtomDB,
    api: ILemonadeAPI
  ) {
    this.definition = definition;
    this.db = db;
    this.api = api;
  }

  /**
   * Loads external data from Lemonade and saves it to the {@link PipelineAtomDB} for
   * later use.
   *
   * TODO:
   * - consider rate limiting and chunking, similarly to how we currently do it in
   *   {@link DevconnectPretixSyncService}.
   */
  public async load(): Promise<void> {
    const events = await this.api.loadEvents(
      this.definition.options.lemonadeApiKey
    );
    const tickets = _.flatMap(events, (e) => e.tickets);
    const relevantTickets = tickets.filter((t) => {
      const eventConfig = this.definition.options.events.find(
        (e) => e.id === t.eventId
      );

      if (!eventConfig) {
        return false;
      }

      const eventConfigHasTicketTier = eventConfig.ticketTierIds.includes(
        t.tierId
      );
      return eventConfigHasTicketTier;
    });

    const atomsToSave: LemonadeAtom[] = relevantTickets.map((t) => {
      return {
        id: t.id
        // TODO: what else should go in here?
      };
    });

    // TODO: error handling
    await this.db.save(this.definition.id, atomsToSave);
  }

  /**
   * TODO:
   * - implement this - return {@link EdDSATicketPCD}s that this user has based
   *   on their email address. Watermark the ticket to the semaphore identity linked
   *   to the {@link EmailPCD} provided as part of this request.
   */
  private async issueLemonadeTicketPCD(
    _credential: SerializedPCD
  ): Promise<PollFeedResponseValue> {
    return {
      actions: []
    };
  }

  /**
   * TODO:
   * - implement this
   * - make sure to check that the given credential corresponds to a superuser ticket type
   */
  private async checkinLemonadeTicketPCD(
    _request: CheckTicketInRequest
  ): Promise<CheckTicketInResponseValue> {
    this.api.checkinTicket("api key", "event id", "get ticket id from request");
  }

  public static is(p: Pipeline): p is LemonadePipeline {
    return p.type === PipelineType.Lemonade;
  }
}

/**
 * TODO: implement this. (Probably Rob).
 */
export class PretixPipeline implements BasePipeline {
  public type = PipelineType.Pretix;
  public capabilities = [
    // TODO: fill this out with an issuance and checkin capability
  ];

  private definition: PretixPipelineDefinition;
  private db: PipelineAtomDB;

  public get id(): string {
    return this.definition.id;
  }

  public constructor(definition: PretixPipelineDefinition, db: PipelineAtomDB) {
    this.definition = definition;
    this.db = db;
  }

  public static is(p: Pipeline): p is PretixPipeline {
    return p.type === PipelineType.Pretix;
  }
}

/**
 * Each new type of {@link Pipeline} needs to be added to this type
 * declaration.
 */
export type Pipeline = LemonadePipeline | PretixPipeline;

/**
 * Given a {@link PipelineDefinition} (which is persisted to the database) instantiates
 * a {@link Pipeline} so that it can be used for loading data from an external provider,
 * and expose its {@link Capability}s to the external world.
 */
export function createPipeline(
  definition: PipelineDefinition,
  db: PipelineAtomDB,
  apis: {
    lemonadeAPI: ILemonadeAPI;
    // TODO: pretix api
  }
): Pipeline {
  if (isLemonadePipelineDefinition(definition)) {
    return new LemonadePipeline(definition, db, apis.lemonadeAPI);
  } else if (isPretixPipelineDefinition(definition)) {
    return new PretixPipeline(definition, db);
  }

  throw new Error(
    `couldn't instantiate pipeline for configuration ${JSON.stringify(
      definition
    )}`
  );
}

/**
 * Given a set of instantiated {@link Pipeline}s, creates routes that handle
 * external HTTP requests.
 */
export async function setupRoutesForPipelines(
  router: Router,
  pipelines: Pipeline[]
): Promise<void> {
  for (const pipeline of pipelines) {
    for (const capability of pipeline.capabilities) {
      await setupRoutesForCapability(router, pipeline, capability);
    }
  }
}

/**
 * TODO:
 * - probably move to a different file than this
 */
export async function setupRoutesForCapability(
  router: Router,
  pipeline: Pipeline,
  capability: BasePipelineCapability
): Promise<void> {
  if (isFeedIssuanceCapability(capability)) {
    setupFeedCapabilityRoutes(router, pipeline, capability);
  } else if (isCheckinCapability(capability)) {
    setupCheckinCapabilityRoutes(router, pipeline, capability);
  } else {
    logger(
      `pipeline ${pipeline.id} capability ${capability} doesn't have a router`
    );
  }
}

/**
 * TODO:
 * - actually interpret HTTP requests, and respond appropriately.
 * - probably move to a different file than this
 */
export async function setupFeedCapabilityRoutes(
  router: Router,
  pipeline: Pipeline,
  capability: FeedIssuanceCapability
): Promise<void> {
  const urlPath = `/generic-issuance/${pipeline.id}/${capability.subId}/poll-feed`;
  capability.urlPath = urlPath;
  router.post(urlPath, (req, res) => {
    res.send("ok"); // TODO
  });
}

/**
 * TODO:
 * - actually interpret HTTP requests, and respond appropriately.
 * - probably move to a different file than this
 */
export async function setupCheckinCapabilityRoutes(
  router: Router,
  pipeline: Pipeline,
  capability: CheckinCapability
): Promise<void> {
  const urlPath = `/generic-issuance/${pipeline.id}/checkin`;
  capability.urlPath = urlPath;
  router.post(urlPath, (req, res) => {
    res.send("ok"); // TODO
  });
}

/**
 * TODO: implement this (probably Ivan or Rob).
 * - Needs to be robust.
 * - Needs to appropriately handle creation of new pipelines.
 * - Needs to execute pipelines on some schedule
 * - Probably overall very similar to {@link DevconnectPretixSyncService}
 */
export class GenericIssuanceService {
  // TODO
}
