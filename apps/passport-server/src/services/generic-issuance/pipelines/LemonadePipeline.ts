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
  GenericCheckinCredentialPayload,
  GenericIssuanceCheckInError,
  GenericIssuanceCheckInRequest,
  GenericIssuanceCheckInResponseValue,
  GenericIssuancePreCheckRequest,
  GenericIssuancePreCheckResponseValue,
  LemonadePipelineDefinition,
  PipelineDefinition,
  PipelineType,
  PollFeedRequest,
  PollFeedResponseValue,
  verifyFeedCredential
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import _ from "lodash";
import { ILemonadeAPI } from "../../../apis/lemonade/lemonadeAPI";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { logger } from "../../../util/logger";
import {
  CheckinCapability,
  CheckinStatus,
  generateCheckinUrlPath
} from "../capabilities/CheckinCapability";
import {
  FeedIssuanceCapability,
  makeGenericIssuanceFeedUrl
} from "../capabilities/FeedIssuanceCapability";
import { PipelineCapability } from "../capabilities/types";
import { BasePipelineCapability } from "../types";
import { BasePipeline, Pipeline } from "./types";

const LOG_NAME = "LemonadePipeline";
const LOG_TAG = `[${LOG_NAME}]`;

const LEMONADE_CHECKER = "Lemonade";

export function isLemonadePipelineDefinition(
  d: PipelineDefinition
): d is LemonadePipelineDefinition {
  return d.type === PipelineType.Lemonade;
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

  // These are all check-in attempts since the last load()
  private pendingCheckIns: Map<
    string,
    { status: CheckinStatus; timestamp: string }
  >;

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
        getCheckinUrl: (): string => generateCheckinUrlPath(),
        canHandleCheckinForEvent: (eventId: string): boolean => {
          return this.definition.options.events.some(
            (ev) => ev.genericIssuanceEventId === eventId
          );
        },
        check: this.checkLemonadeTicketPCDCanBeCheckedIn.bind(this)
      } satisfies CheckinCapability
    ] as unknown as BasePipelineCapability[];
    this.pendingCheckIns = new Map();
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
    // If a check-in succeeded, it will be represented in the data we just
    // saved, so there's no reason to keep this.
    this.pendingCheckIns.forEach((value, key) => {
      if (
        value.status === CheckinStatus.Success ||
        value.status === CheckinStatus.Failed
      ) {
        this.pendingCheckIns.delete(key);
      }
    });
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
          folder: this.definition.options.feedOptions.feedFolder,
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
   * When checking tickets in, the user submits various pieces of data, wrapped
   * in a Semaphore signature.
   * Here we verify the signature, and return the encoded payload.
   */
  private async unwrapCheckInSignature(
    credential: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<GenericCheckinCredentialPayload> {
    const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
      credential.pcd
    );
    const signaturePCDValid =
      await SemaphoreSignaturePCDPackage.verify(signaturePCD);

    if (!signaturePCDValid) {
      throw new Error("Invalid signature");
    }

    const payload: GenericCheckinCredentialPayload = JSON.parse(
      signaturePCD.claim.signedMessage
    );

    return payload;
  }

  /**
   * Given a ticket to check in, and a set of tickets belonging to the user
   * performing the check-in, verify that at least one of the user's tickets
   * belongs to a matching event and is a superuser ticket.
   *
   * Returns true if the user has the permission to check the ticket in, or an
   * error if not.
   */
  private async canCheckIn(
    ticketAtom: LemonadeAtom,
    checkerTickets: LemonadeAtom[]
  ): Promise<true | GenericIssuanceCheckInError> {
    const lemonadeEventId = ticketAtom.lemonadeEventId;

    const lemonadeTicketTier = ticketAtom.lemonadeTierId;

    const eventConfig = this.definition.options.events.find(
      (e) => e.externalId === lemonadeEventId
    );

    if (!eventConfig) {
      return { name: "InvalidTicket" };
    }

    const tierConfig = eventConfig.ticketTiers.find(
      (t) => t.externalId === lemonadeTicketTier
    );

    if (!tierConfig) {
      return { name: "InvalidTicket" };
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
      return { name: "NotSuperuser" };
    }

    return true;
  }

  /**
   * Carry out a set of checks to ensure that a ticket can be checked in. This
   * is done in response to an API request that occurs when the user scans a
   * ticket. It is used by the scanning application to determine whether to
   * show an option to check the ticket in. If check-in is permitted, some
   * ticket data is returned.
   */
  private async checkLemonadeTicketPCDCanBeCheckedIn(
    request: GenericIssuancePreCheckRequest
  ): Promise<GenericIssuancePreCheckResponseValue> {
    let checkerTickets: LemonadeAtom[];
    let ticketId: string;

    try {
      const payload = await this.unwrapCheckInSignature(request.credential);
      const checkerEmailPCD = await EmailPCDPackage.deserialize(
        payload.emailPCD.pcd
      );

      checkerTickets = await this.db.loadByEmail(
        this.id,
        checkerEmailPCD.claim.emailAddress
      );
      ticketId = payload.ticketIdToCheckIn;
    } catch (e) {
      return { canCheckIn: false, error: { name: "InvalidSignature" } };
    }

    const ticketAtom = await this.db.loadById(this.id, ticketId);
    if (!ticketAtom) {
      return { canCheckIn: false, error: { name: "InvalidTicket" } };
    }

    // Check permissions
    const canCheckInResult = await this.canCheckIn(ticketAtom, checkerTickets);

    if (canCheckInResult === true) {
      // TODO Lemonade Atoms should indicate if a ticket is checked in, otherwise
      // we will not be able to remember who is checked in.

      let pendingCheckin;
      if ((pendingCheckin = this.pendingCheckIns.get(ticketAtom.id))) {
        if (
          pendingCheckin.status === CheckinStatus.Pending ||
          pendingCheckin.status === CheckinStatus.Success
        ) {
          return {
            canCheckIn: false,
            error: {
              name: "AlreadyCheckedIn",
              checkinTimestamp: pendingCheckin.timestamp,
              checker: LEMONADE_CHECKER
            }
          };
        }
      }

      return {
        canCheckIn: true,
        eventName: this.lemonadeAtomToEventName(ticketAtom),
        ticketName: this.lemonadeAtomToTicketName(ticketAtom),
        attendeeEmail: ticketAtom.email as string,
        attendeeName: ticketAtom.name
      };
    } else {
      return { canCheckIn: false, error: canCheckInResult };
    }
  }

  /**
   * Perform a check-in.
   * This repeats the checks performed by {@link checkLemonadeTicketPCDCanBeCheckedIn}
   * and, if successful, records that a pending check-in is underway and sends
   * a check-in API request to Lemonade.
   */
  private async checkinLemonadeTicketPCD(
    request: GenericIssuanceCheckInRequest
  ): Promise<GenericIssuanceCheckInResponseValue> {
    logger(
      LOG_TAG,
      `got request to check in tickets with request ${JSON.stringify(request)}`
    );

    let checkerTickets: LemonadeAtom[];
    let ticketId: string;

    try {
      const payload = await this.unwrapCheckInSignature(request.credential);
      const checkerEmailPCD = await EmailPCDPackage.deserialize(
        payload.emailPCD.pcd
      );

      checkerTickets = await this.db.loadByEmail(
        this.id,
        checkerEmailPCD.claim.emailAddress
      );
      ticketId = payload.ticketIdToCheckIn;
    } catch (e) {
      return { checkedIn: false, error: { name: "InvalidSignature" } };
    }

    const ticketAtom = await this.db.loadById(this.id, ticketId);
    if (!ticketAtom) {
      return { checkedIn: false, error: { name: "InvalidTicket" } };
    }

    const canCheckInResult = await this.canCheckIn(ticketAtom, checkerTickets);

    if (canCheckInResult === true) {
      // TODO Lemonade Atoms should indicate if a ticket is checked in, otherwise
      // we will not be able to remember who is checked in.

      let pendingCheckin;
      if ((pendingCheckin = this.pendingCheckIns.get(ticketAtom.id))) {
        if (
          pendingCheckin.status === CheckinStatus.Pending ||
          pendingCheckin.status === CheckinStatus.Success
        ) {
          return {
            checkedIn: false,
            error: {
              name: "AlreadyCheckedIn",
              checkinTimestamp: pendingCheckin.timestamp,
              checker: LEMONADE_CHECKER
            }
          };
        }
      }

      const lemonadeEventId = ticketAtom.lemonadeEventId;

      this.pendingCheckIns.set(ticketAtom.id, {
        status: CheckinStatus.Pending,
        timestamp: new Date().toISOString()
      });
      try {
        await this.api.checkinTicket(
          this.definition.options.lemonadeApiKey,
          lemonadeEventId,
          // Is this the correct ticket ID?
          ticketAtom.id
        );
        this.pendingCheckIns.set(ticketAtom.id, {
          status: CheckinStatus.Success,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        logger(
          `${LOG_TAG} Failed to check in ticket ${
            ticketAtom.id
          } for event ${this.lemonadeAtomToZupassEventId(
            ticketAtom
          )} on behalf of checker ${checkerTickets[0].email}`
        );
        // TODO retry?
        this.pendingCheckIns.set(ticketAtom.id, {
          status: CheckinStatus.Failed,
          timestamp: new Date().toISOString()
        });
        return { checkedIn: false, error: { name: "ServerError" } };
      }

      return { checkedIn: true };
    } else {
      return { checkedIn: false, error: canCheckInResult };
    }
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
