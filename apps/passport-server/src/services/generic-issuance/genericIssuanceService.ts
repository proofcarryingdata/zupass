import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { Router } from "express";
import _ from "lodash";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { PipelineAtomDB } from "../../database/queries/pipelineAtomDB";
import { logger } from "../../util/logger";
import {
  BasePipeline,
  BasePipelineCapability,
  CheckinCapability,
  FeedIssuanceCapability,
  LemonadeAtom,
  LemonadePipelineDefinition,
  PipelineCapability,
  PipelineDefinition,
  PipelineType,
  PretixPipelineDefinition,
  isCheckinCapability,
  isFeedIssuanceCapability,
  isLemonadePipelineDefinition,
  isPretixPipelineDefinition
} from "./types";

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
