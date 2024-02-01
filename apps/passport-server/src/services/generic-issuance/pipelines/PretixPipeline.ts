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
import { v5 as uuidv5 } from "uuid";
import {
  GenericPretixCheckinList,
  GenericPretixEvent,
  GenericPretixEventSettings,
  GenericPretixOrder,
  GenericPretixProduct,
  GenericPretixProductCategory,
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

const LOG_NAME = "PretixPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

/**
 * This object represents a configuration from which the server can instantiate
 * a functioning {@link PretixPipeline}. Partially specified by the user.
 */
export interface PretixPipelineOptions {
  pretixAPIKey: string;
  pretixOrgUrl: string;
  events: PretixEventConfig[];
  feedOptions: FeedIssuanceOptions;
}

/**
 * Configuration for a specific event, which is managed under the organizer's
 * Pretix account.
 */
export interface PretixEventConfig {
  externalId: string; // Pretix's event ID
  genericIssuanceId: string; // Our UUID
  name: string; // Display name for the event
  products: PretixProductConfig[];
}

/**
 * Configuration for specific products available for the event. Does not need
 * to include all products available in Pretix, but any product listed here
 * must be available in Pretix.
 */
export interface PretixProductConfig {
  externalId: string; // Pretix's item ID
  genericIssuanceId: string; // Our UUID
  name: string; // Display name
  isSuperUser: boolean; // Is a user with this product a "superuser"?
  // Superusers are able to check tickets in to events.
}

/**
 * Class encapsulating the complete set of behaviors that a {@link Pipeline} which
 * loads data from Pretix is capable of.
 */
export class PretixPipeline implements BasePipeline {
  public type = PipelineType.Pretix;
  public capabilities: BasePipelineCapability[];

  /**
   * Used to sign {@link EdDSATicketPCD}
   */
  private eddsaPrivateKey: string;
  private definition: PretixPipelineDefinition;
  private zupassPublicKey: EdDSAPublicKey;

  /**
   * This is where the Pipeline stores atoms so that they don't all have
   * to be stored in-memory.
   */
  private db: IPipelineAtomDB<PretixAtom>;
  private api: IGenericPretixAPI;

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
    api: IGenericPretixAPI,
    zupassPublicKey: EdDSAPublicKey
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<PretixAtom>;
    this.api = api;
    this.zupassPublicKey = zupassPublicKey;
    this.capabilities = [
      {
        issue: this.issuePretixTicketPCDs.bind(this),
        options: this.definition.options.feedOptions,
        type: PipelineCapability.FeedIssuance,
        feedUrl: makeGenericIssuanceFeedUrl(
          this.id,
          this.definition.options.feedOptions.feedId
        )
      } satisfies FeedIssuanceCapability,
      {
        checkin: this.checkinPretixTicketPCDs.bind(this),
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
   * - clear tickets after each load? important!!!!
   */
  public async load(): Promise<void> {
    logger(LOG_TAG, `loading for pipeline id ${this.id}`);
    const tickets: PretixTicket[] = [];

    const errors: string[] = [];

    for (const event of this.definition.options.events) {
      // @todo this can throw exceptions. how should we handle this?
      const eventData = await this.loadEvent(event);

      errors.push(...this.validateEventData(eventData, event));

      tickets.push(...(await this.ordersToTickets(event, eventData)));
    }

    if (errors.length > 0) {
      for (const error of errors) {
        logger(`${LOG_TAG}: ${error}`);
      }
      throw new Error(errors.join("\n"));
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
        secret: ticket.secret,
        timestampConsumed: ticket.pretix_checkin_timestamp,
        isConsumed: !!ticket.pretix_checkin_timestamp
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
   * Loads data from Pretix for a single event.
   * Some of this data is used to create tickets, and other data is loaded for
   * the purpose of validating that Pretix is correctly configured.
   */
  private async loadEvent(event: PretixEventConfig): Promise<PretixEventData> {
    return traced(LOG_NAME, "loadEvent", async () => {
      logger(LOG_TAG, `loadEvent`, event);

      const orgUrl = this.definition.options.pretixOrgUrl;
      const token = this.definition.options.pretixAPIKey;
      const eventId = event.externalId;
      const settings = await this.api.fetchEventSettings(
        orgUrl,
        token,
        eventId
      );
      const categories = await this.api.fetchProductCategories(
        orgUrl,
        token,
        eventId
      );
      const products = await this.api.fetchProducts(orgUrl, token, eventId);
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
        products,
        eventInfo,
        orders,
        checkinLists
      };
    });
  }

  /**
   * Validate that an event's settings match our expectations.
   * These settings correspond to the "Ask for email addresses per ticket"
   * setting in the Pretix UI being set to "Ask and require input", which
   * is mandatory for us.
   */
  private validateEventSettings(
    settings: GenericPretixEventSettings,
    eventConfig: PretixEventConfig
  ): string[] {
    const errors = [];
    if (
      settings.attendee_emails_asked !== true ||
      settings.attendee_emails_required !== true
    ) {
      errors.push(
        `"Ask for email addresses per ticket" setting should be set to "Ask and require input" for event ${eventConfig.genericIssuanceId}`
      );
    }

    return errors;
  }

  /**
   * Validate that an item / product's settings match our expectations.
   * These settings correspond to the product (1) either being an add-on item OR of
   * type "Admission" with "Personalization" being set to "Personalized ticket"
   * and (2) "Generate tickets" in the "Tickets & Badges" section being set to
   * "Choose automatically depending on event settings" in the Pretix UI.
   */
  private validateEventItem(
    item: GenericPretixProduct,
    addonCategoryIdSet: Set<number>,
    productConfig: PretixProductConfig
  ): string[] {
    const errors = [];

    // If item is not an add-on, check that it is an Admission product and
    // that "Personalization" is set to "Personalized Ticket"

    if (item.category && !addonCategoryIdSet.has(item.category)) {
      if (item.admission !== true) {
        errors.push(
          `Product type is not "Admission" on product ${JSON.stringify(
            productConfig,
            null,
            2
          )} - addon product categories are ${JSON.stringify([
            ...addonCategoryIdSet
          ])}`
        );
      }

      if (item.personalized !== true) {
        errors.push(
          `"Personalization" is not set to "Personalized ticket" on product ${JSON.stringify(
            productConfig,
            null,
            2
          )} - addon product categories are ${JSON.stringify([
            ...addonCategoryIdSet
          ])}`
        );
      }
    }

    if (
      !(
        item.generate_tickets === null || item.generate_tickets === undefined
      ) &&
      item.generate_tickets !== false
    ) {
      errors.push(
        `"Generate tickets" is not set to "Choose automatically depending on event settings" or "Never" on product ${productConfig.genericIssuanceId}`
      );
    }

    return errors;
  }

  /**
   * Check all of the API responses for an event before syncing them to the
   * DB.
   */
  private validateEventData(
    eventData: PretixEventData,
    eventConfig: PretixEventConfig
  ): string[] {
    const { settings, products: items, categories } = eventData;
    const activeItemIdSet = new Set(
      eventConfig.products.map((product) => product.externalId)
    );
    const superuserItemIdSet = new Set(
      eventConfig.products
        .filter((product) => product.isSuperUser)
        .map((product) => product.externalId)
    );
    const addonCategoryIdSet = new Set(
      categories.filter((a) => a.is_addon).map((a) => a.id)
    );

    // We want to make sure that we log all errors, so we collect everything
    // and only throw an exception once we have found all of them.
    const errors: string[] = [];

    const eventSettingErrors = this.validateEventSettings(
      settings,
      eventConfig
    );
    if (eventSettingErrors.length > 0) {
      errors.push(
        `Event settings for "${eventData.eventInfo.name.en}" (${eventConfig.genericIssuanceId}) are invalid:\n` +
          eventSettingErrors.join("\n")
      );
    }

    const fetchedItemsIdSet = new Set();

    for (const item of items) {
      // Ignore items which are not in the event's "activeItemIDs" set
      if (activeItemIdSet.has(item.id.toString())) {
        fetchedItemsIdSet.add(item.id.toString());
        const productConfig = eventConfig.products.find(
          (product) => product.externalId === item.id.toString()
        );
        const itemErrors = this.validateEventItem(
          item,
          addonCategoryIdSet,
          productConfig as PretixProductConfig
        );
        if (itemErrors.length > 0) {
          errors.push(
            `Product "${item.name.en}" (${productConfig?.genericIssuanceId}) in event "${eventData.eventInfo.name.en}" is invalid:\n` +
              itemErrors.join("\n")
          );
        }
      }
    }

    const activeItemDiff = [...activeItemIdSet].filter(
      (x) => !fetchedItemsIdSet.has(x)
    );

    const superuserItemDiff = [...superuserItemIdSet].filter(
      (x) => !fetchedItemsIdSet.has(x)
    );

    if (activeItemDiff.length > 0) {
      errors.push(
        `Active items with ID(s) "${activeItemDiff.join(
          ", "
        )}" are present in config but not in data fetched from Pretix for event ${
          eventConfig.genericIssuanceId
        }`
      );
    }

    if (superuserItemDiff.length > 0) {
      errors.push(
        `Superuser items with ID(s) "${superuserItemDiff.join(
          ", "
        )}" are present in config but not in data fetched from Pretix for event ${
          eventConfig.genericIssuanceId
        }`
      );
    }

    if (eventData.checkinLists.length > 1) {
      errors.push(
        `Event "${eventData.eventInfo.name.en}" (${eventConfig.genericIssuanceId}) has multiple check-in lists`
      );
    }

    if (eventData.checkinLists.length < 1) {
      errors.push(
        `Event "${eventData.eventInfo.name.en}" (${eventConfig.genericIssuanceId}) has no check-in lists`
      );
    }

    return errors;
  }

  /**
   * Converts a given list of orders to tickets.
   */
  private async ordersToTickets(
    eventConfig: PretixEventConfig,
    eventData: PretixEventData
  ): Promise<PretixTicket[]> {
    const tickets: PretixTicket[] = [];
    const { orders } = eventData;
    const fetchedItemIds = new Set(
      eventData.products.map((item) => item.id.toString())
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
        // The product should always exist, since the validation functions
        // ensure it. But TypeScript doesn't know that.
        if (product) {
          // Try getting email from response to question; otherwise, default to email of purchaser
          const email = normalizeEmail(attendee_email ?? order.email);

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
            full_name: attendee_name ?? order.name ?? "", // Fallback since we have a not-null constraint
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

    const result: PollFeedResponseValue = {
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

    return result;
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

// Collection of API data for a single event
interface PretixEventData {
  settings: GenericPretixEventSettings;
  eventInfo: GenericPretixEvent;
  categories: GenericPretixProductCategory[];
  products: GenericPretixProduct[];
  orders: GenericPretixOrder[];
  checkinLists: GenericPretixCheckinList[];
}

export interface PretixTicket {
  email: string;
  full_name: string;
  product: PretixProductConfig;
  event: PretixEventConfig;
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
  timestampConsumed: Date | null;
  isConsumed: boolean;
}
