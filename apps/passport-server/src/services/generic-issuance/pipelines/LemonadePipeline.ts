import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import { getHash } from "@pcd/passport-crypto";
import {
  CheckTicketInResponseValue,
  FeedCredentialPayload,
  GenericCheckinCredentialPayload,
  GenericIssuanceCheckInRequest,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
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
  externalId: string;
  name: string;
  genericIssuanceEventId: string;
  ticketTiers: LemonadePipelineTicketTierConfig[];
}

export interface LemonadePipelineTicketTierConfig {
  externalId: string;
  genericIssuanceProductId: string;
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
   * - clear tickets after each load?
   */
  public async load(): Promise<void> {
    logger(LOG_TAG, `loading for pipeline id ${this.id}`);

    const events = await this.api.loadEvents(
      this.definition.options.lemonadeApiKey
    );
    const tickets = _.flatMap(events, (e) => e.tickets);
    const relevantTickets = tickets.filter((t) => {
      const eventConfig = this.definition.options.events.find(
        (e) => e.externalId === t.eventId
      );

      if (!eventConfig) {
        return false;
      }

      const eventConfigHasTicketTier =
        eventConfig.ticketTiers.find((tier) => tier.externalId === t.tierId) !==
        undefined;

      return eventConfigHasTicketTier;
    });

    const atomsToSave: LemonadeAtom[] = relevantTickets.map((t) => {
      return {
        id: t.id,
        email: t.email,
        name: t.name,
        lemonadeEventId: t.eventId,
        lemonadeTierId: t.tierId
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

  private eddsaTicketToLemonadeEventId(ticket: EdDSATicketPCD): string {
    const correspondingEventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceEventId === ticket.claim.ticket.eventId
    );

    if (!correspondingEventConfig) {
      throw new Error("no matching event id");
    }

    return correspondingEventConfig.externalId;
  }

  private eddsaTicketToLemonadeTierId(ticket: EdDSATicketPCD): string {
    const correspondingEventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceEventId === ticket.claim.ticket.eventId
    );

    if (!correspondingEventConfig) {
      throw new Error("no matching event id");
    }

    const correspondingTierConfig = correspondingEventConfig.ticketTiers.find(
      (t) => t.genericIssuanceProductId === ticket.claim.ticket.productId
    );

    if (!correspondingTierConfig) {
      throw new Error("no matching tier id");
    }

    return correspondingTierConfig.externalId;
  }

  private lemonadeAtomToZupassEventId(atom: LemonadeAtom): string {
    const correspondingEventConfig = this.definition.options.events.find(
      (e) => e.externalId === atom.lemonadeEventId
    );

    if (!correspondingEventConfig) {
      throw new Error("no matching event id");
    }

    return correspondingEventConfig.genericIssuanceEventId;
  }

  private lemonadeAtomToZupassProductId(atom: LemonadeAtom): string {
    const correspondingEventConfig = this.definition.options.events.find(
      (e) => e.externalId === atom.lemonadeEventId
    );

    if (!correspondingEventConfig) {
      throw new Error("no matching event id");
    }

    const correspondingTierConfig = correspondingEventConfig.ticketTiers.find(
      (t) => t.externalId === atom.lemonadeTierId
    );

    if (!correspondingTierConfig) {
      throw new Error("no corresponding tier config");
    }

    return correspondingTierConfig.genericIssuanceProductId;
  }

  private lemonadeAtomToEventName(atom: LemonadeAtom): string {
    const event = this.definition.options.events.find(
      (e) => e.externalId === atom.lemonadeEventId
    );

    if (!event) {
      throw new Error(
        `no lemonade event with id ${atom.lemonadeEventId} in pipeline ${this.id}`
      );
    }

    return event.name;
  }

  private lemonadeAtomToTicketName(atom: LemonadeAtom): string {
    // TODO
    return atom.lemonadeTierId;
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
      eventName: this.lemonadeAtomToEventName(atom),
      ticketName: this.lemonadeAtomToTicketName(atom),
      checkerEmail: undefined, // TODO

      // signed fields
      ticketId: atom.id,
      eventId: this.lemonadeAtomToZupassEventId(atom),
      productId: this.lemonadeAtomToZupassProductId(atom),
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
    request: GenericIssuanceCheckInRequest
  ): Promise<CheckTicketInResponseValue> {
    logger(
      LOG_TAG,
      `got request to check in tickets with request ${JSON.stringify(request)}`
    );

    const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
      request.credential.pcd
    );
    const signaturePCDValid =
      await SemaphoreSignaturePCDPackage.verify(signaturePCD);

    if (!signaturePCDValid) {
      throw new Error("credential signature invalid");
    }

    const payload: GenericCheckinCredentialPayload = JSON.parse(
      signaturePCD.claim.signedMessage
    );

    const checkerEmailPCD = await EmailPCDPackage.deserialize(
      payload.emailPCD.pcd
    );
    const ticketToCheckIn = await EdDSATicketPCDPackage.deserialize(
      payload.ticketToCheckIn.pcd
    );

    logger("checkerEmailPCD", checkerEmailPCD);
    logger("ticketToCheckIn", ticketToCheckIn);

    // TODO: check if all the credentials line up
    // - pubkey matches generic issuance pkey
    // - signature is valid

    const lemonadeEventId = this.eddsaTicketToLemonadeEventId(ticketToCheckIn);

    // TODO: error handling
    await this.api.checkinTicket(
      this.definition.options.lemonadeApiKey,
      lemonadeEventId,
      ticketToCheckIn.claim.ticket.ticketId
    );
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
  lemonadeEventId: string;
  lemonadeTierId: string;
}
