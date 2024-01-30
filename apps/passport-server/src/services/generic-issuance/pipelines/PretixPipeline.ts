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
import { v5 as uuidv5 } from "uuid";
import {
  GenericPretixCategory,
  GenericPretixCheckinList,
  GenericPretixEvent,
  GenericPretixEventSettings,
  GenericPretixItem,
  GenericPretixOrder,
  IGenericPretixAPI
} from "../../../apis/pretix/genericPretixAPI";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { mostRecentCheckinEvent } from "../../../util/devconnectTicket";
import { logger } from "../../../util/logger";
import { normalizeEmail } from "../../../util/util";
import { traced } from "../../telemetryService";
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

const LOG_NAME = "PretixPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

/**
 * TODO: implement this. (Probably Rob).
 */
export class PretixPipeline implements BasePipeline {
  public type = PipelineType.Pretix;
  public capabilities = [
    {
      issue: this.issuePretixTicketPCDs.bind(this),
      feedId: "ticket-feed",
      type: PipelineCapability.FeedIssuance,
      getFeedUrl: (): string => generateIssuanceUrlPath(this.id)
    } satisfies FeedIssuanceCapability,
    {
      checkin: this.checkinPretixTicketPCDs.bind(this),
      type: PipelineCapability.Checkin,
      getCheckinUrl: (): string => generateCheckinUrlPath(this.id)
    } satisfies CheckinCapability
  ];

  private eddsaPrivateKey: string;
  private definition: PretixPipelineDefinition;
  private db: IPipelineAtomDB<PretixAtom>;
  private api: IGenericPretixAPI;

  // @todo remove this
  public getDB(): IPipelineAtomDB {
    return this.db;
  }

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
    definition: PretixPipelineDefinition,
    db: IPipelineAtomDB,
    api: IGenericPretixAPI
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<PretixAtom>;
    this.api = api;
  }

  public async load(): Promise<void> {
    logger(LOG_TAG, `loading for pipeline id ${this.id}`);
    const tickets: PretixTicket[] = [];

    for (const event of this.definition.options.events) {
      // @todo validate event data (e.g. pretix settings)
      // @todo this can throw exceptions. how should we handle this?
      const eventData = await this.loadEvent(event);

      tickets.push(...(await this.ordersToTickets(event, eventData)));
    }

    const atomsToSave: PretixAtom[] = tickets.map((ticket) => {
      return {
        email: ticket.email,
        name: ticket.full_name,
        eventId: ticket.event.genericIssuanceId,
        productId: ticket.product.genericIssuanceId,
        // Use the event ID as the "namespace" when hashing the position ID.
        // The event ID is a UUID that is part of our configuration, and is
        // globally unique. The position ID is not globally unique, but is
        // unique within the namespace of the event.
        id: uuidv5(ticket.position_id, ticket.event.genericIssuanceId),
        secret: ticket.secret
      };
    });

    logger(
      LOG_TAG,
      `saving ${atomsToSave.length} atoms for pipeline id ${this.id}`
    );

    // TODO: error handling
    await this.db.save(this.definition.id, atomsToSave);
  }

  private async loadEvent(event: PretixEventConfig): Promise<PretixEventData> {
    return traced(LOG_NAME, "loadEvents", async () => {
      const orgUrl = this.definition.options.pretixOrgUrl;
      const token = this.definition.options.pretixAPIKey;
      const eventId = event.externalId;
      const settings = await this.api.fetchEventSettings(
        orgUrl,
        token,
        eventId
      );
      const categories = await this.api.fetchCategories(orgUrl, token, eventId);
      const items = await this.api.fetchItems(orgUrl, token, eventId);
      const eventInfo = await this.api.fetchEvent(orgUrl, token, eventId);
      const orders = await this.api.fetchOrders(orgUrl, token, eventId);
      const checkinLists = await this.api.fetchEventCheckinLists(
        orgUrl,
        token,
        eventId
      );

      return {
        settings,
        categories,
        items,
        eventInfo,
        orders,
        checkinLists
      };
    });
  }

  /**
   * Converts a given list of orders to tickets, and sets
   * all of their roles to equal the given role. When `subEvents`
   * is passed in as a parameter, cross-reference them with the
   * orders, and set the visitor date ranges for the new
   * `DevconnectPretixTicket` to equal to the date ranges of the visitor
   * subevent events they have in their order.
   */
  private async ordersToTickets(
    eventConfig: PretixEventConfig,
    eventData: PretixEventData
  ): Promise<PretixTicket[]> {
    // Go through all orders and aggregate all item IDs under
    // the same (email, event_id, organizer_url) tuple. Since we're
    // already fixing the event_id and organizer_url in this function,
    // we just need to have the email as the key for this map.
    const tickets: PretixTicket[] = [];
    const { orders } = eventData;
    const fetchedItemIds = new Set(
      eventData.items.map((item) => item.id.toString())
    );
    const products = new Map(
      eventConfig.products
        .filter((product) => fetchedItemIds.has(product.externalId))
        .map((product) => [product.externalId, product])
    );
    for (const order of orders) {
      // check that they paid
      if (order.status !== "p") {
        continue;
      }
      for (const {
        id,
        item,
        attendee_name,
        attendee_email,
        secret,
        checkins
      } of order.positions) {
        const product = products.get(item.toString());
        if (product) {
          // Try getting email from response to question; otherwise, default to email of purchaser
          const email = normalizeEmail(attendee_email || order.email);

          // Checkin events can be either "entry" or "exit".
          // Exits cancel out entries, so we want to find out if the most
          // recent event was an entry or exit.
          const checkin = mostRecentCheckinEvent(checkins);
          // If the most recent event was an entry, the user is checked in
          const pretix_checkin_timestamp_string =
            checkin && checkin.type === "entry" ? checkin.datetime : null;

          let pretix_checkin_timestamp: Date | null = null;

          if (pretix_checkin_timestamp_string != null) {
            try {
              const parsedDate = Date.parse(
                pretix_checkin_timestamp_string ?? ""
              );
              if (!isNaN(parsedDate)) {
                pretix_checkin_timestamp = new Date(parsedDate);
              }
            } catch (e) {
              logger(
                LOG_TAG,
                "couldn't parse date",
                pretix_checkin_timestamp_string,
                e
              );
            }
          }

          tickets.push({
            email,
            product,
            event: eventConfig,
            full_name: attendee_name || order.name || "", // Fallback since we have a not-null constraint
            is_deleted: false,
            is_consumed: pretix_checkin_timestamp !== null,
            position_id: id.toString(),
            secret,
            pretix_checkin_timestamp
          });
        }
      }
    }
    return tickets;
  }

  private async issuePretixTicketPCDs(
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

  private atomToTicketData(atom: PretixAtom, semaphoreId: string): ITicketData {
    if (!atom.email) {
      throw new Error(`Atom missing email: ${atom.id}`);
    }

    return {
      // unsigned fields
      attendeeName: atom.name,
      attendeeEmail: atom.email,
      eventName: this.atomToEventName(atom),
      ticketName: this.atomToTicketName(atom),
      checkerEmail: undefined,

      // signed fields
      ticketId: atom.id,
      eventId: atom.eventId,
      productId: atom.productId,
      timestampConsumed: 0,
      timestampSigned: Date.now(),
      attendeeSemaphoreId: semaphoreId,
      isConsumed: false,
      isRevoked: false,
      ticketCategory: TicketCategory.Generic
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

  private async checkinPretixTicketPCDs(
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

    const pretixEventId = this.eddsaTicketToPretixEventId(ticketToCheckIn);

    const pretixProductId = this.eddsaTicketToPretixProductId(ticketToCheckIn);

    const eventConfig = this.definition.options.events.find(
      (e) => e.externalId === pretixEventId
    );

    if (!eventConfig) {
      throw new Error(
        `${pretixEventId} has no corresponding event configuration`
      );
    }

    const productConfig = eventConfig.products.find(
      (t) => t.externalId === pretixProductId
    );

    if (!productConfig) {
      throw new Error(
        `${pretixProductId} has no corresponding product configuration`
      );
    }

    const checkerEventTickets = checkerTickets.filter(
      (t) => t.eventId === eventConfig.genericIssuanceId
    );
    const checkerProducts = checkerEventTickets.map((t) => {
      const productConfig = eventConfig.products.find(
        (p) => p.genericIssuanceId === t.productId
      );
      return productConfig;
    });
    const hasSuperUserProductTicket = checkerProducts.find(
      (t) => t?.isSuperUser
    );

    if (!hasSuperUserProductTicket) {
      throw new Error(
        `user ${checkerEmailPCD.claim.emailAddress} doesn't have a superuser ticket`
      );
    }

    const ticketAtom = await this.db.loadById(
      this.id,
      ticketToCheckIn.claim.ticket.ticketId
    );
    if (!ticketAtom) {
      throw new Error(
        `Could not load atom for ticket id ${ticketToCheckIn.claim.ticket.ticketId}`
      );
    }

    const checkinLists = await this.api.fetchEventCheckinLists(
      this.definition.options.pretixOrgUrl,
      this.definition.options.pretixAPIKey,
      pretixEventId
    );

    if (checkinLists.length === 0) {
      throw new Error(
        `Could not fetch check-in lists for ${eventConfig.genericIssuanceId}`
      );
    }

    // TODO: error handling
    await this.api.pushCheckin(
      this.definition.options.pretixOrgUrl,
      this.definition.options.pretixAPIKey,
      ticketAtom.secret,
      checkinLists[0].id.toString(),
      new Date().toISOString()
    );
    return;
  }

  private atomToEventName(atom: PretixAtom): string {
    const event = this.definition.options.events.find(
      (event) => event.genericIssuanceId === atom.eventId
    );

    if (!event) {
      throw new Error(
        `no pretix event with id ${atom.eventId} in pipeline ${this.id}`
      );
    }

    return event.name;
  }

  private atomToTicketName(atom: PretixAtom): string {
    const event = this.definition.options.events.find(
      (event) => event.genericIssuanceId === atom.eventId
    );

    if (!event) {
      throw new Error(
        `no pretix event with id ${atom.eventId} in pipeline ${this.id}`
      );
    }

    const product = event.products.find(
      (product) => product.genericIssuanceId === atom.productId
    );

    if (!product) {
      throw new Error(
        `no pretix product with id ${atom.productId} in pipeline ${this.id}`
      );
    }

    return product.name;
  }

  private eddsaTicketToPretixEventId(ticket: EdDSATicketPCD): string {
    const correspondingEventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceId === ticket.claim.ticket.eventId
    );

    if (!correspondingEventConfig) {
      throw new Error("no matching event id");
    }

    return correspondingEventConfig.externalId;
  }

  private eddsaTicketToPretixProductId(ticket: EdDSATicketPCD): string {
    const correspondingEventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceId === ticket.claim.ticket.eventId
    );

    if (!correspondingEventConfig) {
      throw new Error("no matching event id");
    }

    const correspondingProductConfig = correspondingEventConfig.products.find(
      (p) => p.genericIssuanceId === ticket.claim.ticket.productId
    );

    if (!correspondingProductConfig) {
      throw new Error("no matching product id");
    }

    return correspondingProductConfig.externalId;
  }

  public static is(p: Pipeline): p is PretixPipeline {
    return p.type === PipelineType.Pretix;
  }
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
 */
export interface PretixEventConfig {
  externalId: string; // Pretix's event ID
  genericIssuanceId: string; // Our UUID
  name: string;
  products: PretixProductConfig[];
}

export interface PretixProductConfig {
  externalId: string; // Pretix's item ID
  genericIssuanceId: string; // Our UUID
  name: string;
  isSuperUser: boolean;
}

// Collection of API data for a single event
interface PretixEventData {
  settings: GenericPretixEventSettings;
  eventInfo: GenericPretixEvent;
  categories: GenericPretixCategory[];
  items: GenericPretixItem[];
  orders: GenericPretixOrder[];
  checkinLists: GenericPretixCheckinList[];
}

export interface PretixTicket {
  email: string;
  full_name: string;
  product: PretixProductConfig;
  event: PretixEventConfig;
  is_deleted: boolean;
  is_consumed: boolean;
  secret: string;
  position_id: string;
  pretix_checkin_timestamp: Date | null;
}

export interface PretixAtom extends PipelineAtom {
  name: string;
  eventId: string; // UUID
  productId: string; // UUID
  secret: string;
}
