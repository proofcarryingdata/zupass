import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import _ from "lodash";
import { ILemonadeAPI } from "../../../apis/lemonade/lemonadeAPI";
import { PipelineAtomDB } from "../../../database/queries/pipelineAtomDB";
import { CheckinCapability } from "../capabilities/CheckinCapability";
import { FeedIssuanceCapability } from "../capabilities/FeedIssuanceCapability";
import {
  LemonadeAtom,
  LemonadePipelineDefinition,
  PipelineCapability,
  PipelineType
} from "../types";
import { BasePipeline, Pipeline } from "./types";

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
