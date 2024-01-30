import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import { getHash } from "@pcd/passport-crypto";
import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  FeedCredentialPayload,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { randomUUID } from "crypto";
import _ from "lodash";
import { ILemonadeAPI } from "../../../apis/lemonade/lemonadeAPI";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { logger } from "../../../util/logger";
import {
  CheckinCapability,
  generateCheckinUrlPath
} from "../capabilities/CheckinCapability";
import {
  FeedIssuanceCapability,
  generateIssuanceUrlPath
} from "../capabilities/FeedIssuanceCapability";
import { PipelineCapability } from "../capabilities/types";
import {
  BasePipeline,
  BasePipelineDefinition,
  Pipeline,
  PipelineDefinition,
  PipelineType
} from "./types";

const LOG_NAME = "LemonadePipeline";
const LOG_TAG = `[${LOG_NAME}]`;

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
 * Generic Issuance-specific event configuration. Should roughly match up to the
 * types defined above - {@link LemonadeTicket}, {@link LemonadeEvent}, and
 * {@link LemonadeTicketTier}.
 */
export interface LemonadePipelineEventConfig {
  id: string;
  name: string;
  ticketTierIds: string[];
}

/**
 * TODO: finalize this
 */
export interface LemonadePipelineOptions {
  lemonadeApiKey: string;
  events: LemonadePipelineEventConfig[];
}

/**
 * Class encapsulating the complete set of behaviors that a {@link Pipeline} which
 * loads data from Lemonade is capable of.
 */
export class LemonadePipeline implements BasePipeline {
  public type = PipelineType.Lemonade;
  public capabilities = [
    {
      issue: this.issueLemonadeTicketPCDs.bind(this),
      feedId: "ticket-feed",
      type: PipelineCapability.FeedIssuance,
      getFeedUrl: (): string => generateIssuanceUrlPath(this.id)
    } satisfies FeedIssuanceCapability,
    {
      checkin: this.checkinLemonadeTicketPCD.bind(this),
      type: PipelineCapability.Checkin,
      getCheckinUrl: (): string => generateCheckinUrlPath(this.id)
    } satisfies CheckinCapability
  ];

  private eddsaPrivateKey: string;
  private definition: LemonadePipelineDefinition;
  private db: IPipelineAtomDB<LemonadeAtom>;
  private api: ILemonadeAPI;

  public get id(): string {
    return this.definition.id;
  }

  public get issuanceCapability(): FeedIssuanceCapability {
    return this.capabilities[0] as FeedIssuanceCapability;
  }

  public get checkinCapability(): CheckinCapability {
    return this.capabilities[1] as CheckinCapability;
  }

  public constructor(
    eddsaPrivateKey: string,
    definition: LemonadePipelineDefinition,
    db: IPipelineAtomDB,
    api: ILemonadeAPI
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<LemonadeAtom>;
    this.api = api;
  }

  /**
   * Loads external data from Lemonade and saves it to the {@link IPipelineAtomDB} for
   * later use.
   *
   * TODO:
   * - consider rate limiting and chunking, similarly to how we currently do it in
   *   {@link DevconnectPretixSyncService}.
   */
  public async load(): Promise<void> {
    logger(LOG_TAG, `loading for pipeline id ${this.id}`);

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
        id: t.id,
        email: t.email,
        name: t.name
      };
    });

    logger(
      LOG_TAG,
      `saving ${atomsToSave.length} atoms for pipeline id ${this.id}`
    );
    logger(atomsToSave);

    // TODO: error handling
    await this.db.save(this.definition.id, atomsToSave);
  }

  /**
   * TODO:
   * - implement this - return {@link EdDSATicketPCD}s that this user has based
   *   on their email address. Watermark the ticket to the semaphore identity linked
   *   to the {@link EmailPCD} provided as part of this request.
   */
  private async issueLemonadeTicketPCDs(
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    if (!req.pcd) {
      throw new Error("missing credential pcd");
    }

    const credential = await SemaphoreSignaturePCDPackage.deserialize(
      req.pcd.pcd
    );
    const feedCredential: FeedCredentialPayload = JSON.parse(
      credential.claim.signedMessage
    );

    const serializedEmailPCD = feedCredential.pcd?.pcd;
    if (!serializedEmailPCD) {
      throw new Error("missing email pcd");
    }

    const emailPCD = await EmailPCDPackage.deserialize(serializedEmailPCD);
    // TODO: verify the email pcd
    // - that the signature is valid
    // - that it was signed by the Zupass Server

    const email = emailPCD.claim.emailAddress;

    const relevantTickets = await this.db.loadByEmail(this.id, email);
    logger(`email from email pcd`, email);
    logger(`tickets corresponding to email ${email}`, relevantTickets);

    const ticketDatas = relevantTickets.map((t) =>
      this.atomToTicketData(t, credential.claim.identityCommitment)
    );

    // TODO: cache this intelligently
    const tickets = await Promise.all(
      ticketDatas.map((t) =>
        this.ticketDataToTicketPCD(t, this.eddsaPrivateKey)
      )
    );

    return {
      actions: [
        {
          type: PCDActionType.ReplaceInFolder,
          folder: "folder",
          pcds: await Promise.all(
            tickets.map((t) => EdDSATicketPCDPackage.serialize(t))
          )
        }
      ]
    };
  }

  private async ticketDataToTicketPCD(
    ticketData: ITicketData,
    eddsaPrivateKey: string
  ): Promise<EdDSATicketPCD> {
    const stableId = await getHash("issued-ticket-" + ticketData.ticketId);

    const ticketPCD = await EdDSATicketPCDPackage.prove({
      ticket: {
        value: ticketData,
        argumentType: ArgumentTypeName.Object
      },
      privateKey: {
        value: eddsaPrivateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: stableId,
        argumentType: ArgumentTypeName.String
      }
    });

    return ticketPCD;
  }

  private atomToTicketData(
    atom: LemonadeAtom,
    semaphoreId: string
  ): ITicketData {
    if (!atom.email) {
      throw new Error("no"); // TODO
    }

    return {
      // unsigned fields
      attendeeName: atom.name,
      attendeeEmail: atom.email,
      eventName: "event name", // TODO
      ticketName: "ticket name", // TODO
      checkerEmail: undefined, // TODO

      // signed fields
      ticketId: atom.id,
      eventId: randomUUID(), // TODO
      productId: randomUUID(), // TODO
      timestampConsumed: 0, // TODO
      timestampSigned: Date.now(),
      attendeeSemaphoreId: semaphoreId,
      isConsumed: false, // TODO
      isRevoked: false, // TODO
      ticketCategory: TicketCategory.Generic // TODO?
    } satisfies ITicketData;
  }

  /**
   * TODO:
   * - implement this
   * - make sure to check that the given credential corresponds to a superuser ticket type
   */
  private async checkinLemonadeTicketPCD(
    request: CheckTicketInRequest
  ): Promise<CheckTicketInResponseValue> {
    // logger(
    //   LOG_TAG,
    //   `got request to check in tickets with request ${JSON.stringify(request)}`
    // );

    this.api.checkinTicket("api key", "event id", "get ticket id from request");
  }

  public static is(p: Pipeline): p is LemonadePipeline {
    return p.type === PipelineType.Lemonade;
  }
}

/**
 * Intermediate representation which the {@link LemonadePipeline} uses to
 * save tickets, in order to be able to issue tickets based on them later on.
 */
export interface LemonadeAtom extends PipelineAtom {
  // todo
  name: string;
}
