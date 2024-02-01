import { EdDSAPublicKey, isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
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
  GenericCheckinCredentialPayload,
  GenericIssuanceCheckInRequest,
  PollFeedRequest,
  PollFeedResponseValue,
  verifyFeedCredential
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
  makeGenericIssuanceFeedUrl
} from "../capabilities/FeedIssuanceCapability";
import { PipelineCapability } from "../capabilities/types";
import { BasePipelineCapability } from "../types";
import {
  BasePipeline,
  BasePipelineDefinition,
  FeedIssuanceOptions,
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
 * Configured by the user when setting up Lemonade as a data source.
 */
export interface LemonadePipelineOptions {
  lemonadeApiKey: string;
  events: LemonadePipelineEventConfig[];
  feedOptions: FeedIssuanceOptions;
}

/**
 * Class encapsulating the complete set of behaviors that a {@link Pipeline} which
 * loads data from Lemonade is capable of.
 */
export class LemonadePipeline implements BasePipeline {
  public type = PipelineType.Lemonade;
  public capabilities: BasePipelineCapability[];

  /**
   * Used to sign {@link EdDSATicketPCD}
   */
  private eddsaPrivateKey: string;
  private definition: LemonadePipelineDefinition;
  private zupassPublicKey: EdDSAPublicKey;

  /**
   * This is where the Pipeline stores atoms so that they don't all have
   * to be stored in-memory.
   */
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
    api: ILemonadeAPI,
    zupassPublicKey: EdDSAPublicKey
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<LemonadeAtom>;
    this.api = api;
    this.zupassPublicKey = zupassPublicKey;

    this.capabilities = [
      {
        issue: this.issueLemonadeTicketPCDs.bind(this),
        options: this.definition.options.feedOptions,
        type: PipelineCapability.FeedIssuance,
        feedUrl: makeGenericIssuanceFeedUrl(
          this.id,
          this.definition.options.feedOptions.feedId
        )
      } satisfies FeedIssuanceCapability,
      {
        checkin: this.checkinLemonadeTicketPCD.bind(this),
        type: PipelineCapability.Checkin,
        getCheckinUrl: (): string => generateCheckinUrlPath(this.id)
      } satisfies CheckinCapability
    ] as unknown as BasePipelineCapability[];
  }

  /**
   * Loads external data from Lemonade and saves it to the {@link IPipelineAtomDB} for
   * later use.
   *
   * TODO:
   * - consider rate limiting and chunking, similarly to how we currently do it in
   *   {@link DevconnectPretixSyncService}.
   * - clear tickets after each load? important!!!!
   */
  public async load(): Promise<void> {
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

    // TODO: error handling
    await this.db.save(this.definition.id, atomsToSave);
  }

  /**
   * TODO:
   * - proper validation of credentials.
   * - be robust to any single ticket failing to convert.
   */
  private async issueLemonadeTicketPCDs(
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    if (!req.pcd) {
      throw new Error("missing credential pcd");
    }

    // TODO: cache the verification
    const { pcd: credential, payload } = await verifyFeedCredential(req.pcd);

    const serializedEmailPCD = payload.pcd;
    if (!serializedEmailPCD) {
      throw new Error("missing email pcd");
    }

    const emailPCD = await EmailPCDPackage.deserialize(serializedEmailPCD.pcd);

    if (emailPCD.claim.semaphoreId !== credential.claim.identityCommitment) {
      throw new Error(`Semaphore signature does not match email PCD`);
    }

    if (
      !isEqualEdDSAPublicKey(
        emailPCD.proof.eddsaPCD.claim.publicKey,
        this.zupassPublicKey
      )
    ) {
      throw new Error(`Email PCD is not signed by Zupass`);
    }

    const email = emailPCD.claim.emailAddress;
    const relevantTickets = await this.db.loadByEmail(this.id, email);
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
          folder: "lemonade",
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

  /**
   * It's important to keep this up to date with whatever is in Lemonade.
   * Thus, the {@link LemonadePipeline#load} function should probably have
   * the ability to update its {@link PipelineDefinition}, as that is where
   * the 'name' of ticket tiers (which corresponds to the ticket name) is stored.
   */
  private lemonadeAtomToTicketName(atom: LemonadeAtom): string {
    return atom.lemonadeTierId;
  }

  /**
   * Very WIP, did my best here.
   */
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

    const checkerTickets = await this.db.loadByEmail(
      this.id,
      checkerEmailPCD.claim.emailAddress
    );

    const ticketToCheckIn = await EdDSATicketPCDPackage.deserialize(
      payload.ticketToCheckIn.pcd
    );

    // TODO: check if all the credentials line up
    // - pubkey matches generic issuance pkey
    // - signature is valid
    // - event / tier are real

    const lemonadeEventId = this.eddsaTicketToLemonadeEventId(ticketToCheckIn);

    const lemonadeTicketTier =
      this.eddsaTicketToLemonadeTierId(ticketToCheckIn);

    const eventConfig = this.definition.options.events.find(
      (e) => e.externalId === lemonadeEventId
    );

    if (!eventConfig) {
      throw new Error(
        `${lemonadeEventId} has no corresponding event configuration`
      );
    }

    const tierConfig = eventConfig.ticketTiers.find(
      (t) => t.externalId === lemonadeTicketTier
    );

    if (!tierConfig) {
      throw new Error(`${tierConfig} has no corresponding tier configuration`);
    }

    const checkerEventTickets = checkerTickets.filter(
      (t) => t.lemonadeEventId === lemonadeEventId
    );
    const checkerEventTiers = checkerEventTickets.map((t) => {
      const tierConfig = eventConfig.ticketTiers.find(
        (tier) => tier.externalId === t.lemonadeTierId
      );
      return tierConfig;
    });
    const hasSuperUserTierTicket = checkerEventTiers.find(
      (t) => t?.isSuperUser
    );

    if (!hasSuperUserTierTicket) {
      throw new Error(
        `user ${checkerEmailPCD.claim.emailAddress} doesn't have a superuser ticket`
      );
    }

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
