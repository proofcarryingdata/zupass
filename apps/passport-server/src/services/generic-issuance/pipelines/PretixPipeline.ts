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
  PipelineDefinition,
  PipelineType,
  PollFeedRequest,
  PollFeedResponseValue,
  PretixEventConfig,
  PretixPipelineDefinition,
  PretixProductConfig,
  verifyFeedCredential
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
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

const LOG_NAME = "PretixPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

const PRETIX_CHECKER = "Pretix";

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

  // Pending check-ins are check-ins which have either completed (and have
  // succeeded) or are in-progress, but which are not yet reflected in the data
  // loaded from Lemonade. We use this map to ensure that we do not attempt to
  // check the same ticket in multiple times.
  private pendingCheckIns: Map<
    string,
    { status: CheckinStatus; timestamp: number }
  >;

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
        getCheckinUrl: (): string => generateCheckinUrlPath(),
        canHandleCheckinForEvent: (eventId: string): boolean => {
          return this.definition.options.events.some(
            (ev) => ev.genericIssuanceId === eventId
          );
        },
        preCheck: this.checkPretixTicketPCDCanBeCheckedIn.bind(this)
      } satisfies CheckinCapability
    ] as unknown as BasePipelineCapability[];
    this.pendingCheckIns = new Map();
  }

  public async stop(): Promise<void> {
    logger(LOG_TAG, `stopping PretixPipeline with id ${this.id}`);
    // TODO: what to actually do for a stopped pipeline?
  }

  /**
   * Loads external data from Lemonade and saves it to the {@link IPipelineAtomDB} for
   * later use.
   *
   * TODO:
   * - clear tickets after each load? important!!!!
   */
  public async load(): Promise<void> {
    return traced(LOG_NAME, "load", async (span) => {
      span?.setAttribute("pipeline_id", this.id);
      span?.setAttribute("pipeline_type", this.type);

      logger(LOG_TAG, `loading for pipeline id ${this.id}`);
      const tickets: PretixTicket[] = [];

      const errors: string[] = [];

      const loadStart = Date.now();

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

      const loadEnd = Date.now();

      logger(
        LOG_TAG,
        `loaded ${atomsToSave.length} atoms for pipeline id ${this.id} in ${
          loadEnd - loadStart
        }ms`
      );

      span?.setAttribute("atoms_saved", atomsToSave.length);
      span?.setAttribute("load_duration_ms", loadEnd - loadStart);

      // Remove any pending check-ins that succeeded before loading started.
      // Those that succeeded after loading started might not be represented in
      // the data we fetched, so we can remove them on the next run.
      // Pending checkins with the "Pending" status should not be removed, as
      // they are still in-progress.
      this.pendingCheckIns.forEach((value, key) => {
        if (
          value.status === CheckinStatus.Success &&
          value.timestamp < loadStart
        ) {
          this.pendingCheckIns.delete(key);
        }
      });
    });
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
    return traced(LOG_NAME, "issuePretixTicketPCDs", async (span) => {
      span?.setAttribute("pipeline_id", this.id);
      span?.setAttribute("pipeline_type", this.type);
      if (!req.pcd) {
        throw new Error("missing credential pcd");
      }

      // TODO: cache the verification
      const { pcd: credential, payload } = await verifyFeedCredential(req.pcd);

      const serializedEmailPCD = payload.pcd;
      if (!serializedEmailPCD) {
        throw new Error("missing email pcd");
      }

      const emailPCD = await EmailPCDPackage.deserialize(
        serializedEmailPCD.pcd
      );

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

      span?.setAttribute("pcds_issued", tickets.length);

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
    });
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
      timestampConsumed: atom.timestampConsumed?.getTime() ?? 0,
      timestampSigned: Date.now(),
      attendeeSemaphoreId: semaphoreId,
      isConsumed: atom.isConsumed,
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
    ticketAtom: PretixAtom,
    checkerTickets: PretixAtom[]
  ): Promise<true | GenericIssuanceCheckInError> {
    const pretixEventId = this.atomToPretixEventId(ticketAtom);

    const pretixProductId = this.atomToPretixProductId(ticketAtom);

    const eventConfig = this.definition.options.events.find(
      (e) => e.externalId === pretixEventId
    );

    if (!eventConfig) {
      return { name: "InvalidTicket" };
    }

    const productConfig = eventConfig.products.find(
      (t) => t.externalId === pretixProductId
    );

    if (!productConfig) {
      return { name: "InvalidTicket" };
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
  private async checkPretixTicketPCDCanBeCheckedIn(
    request: GenericIssuancePreCheckRequest
  ): Promise<GenericIssuancePreCheckResponseValue> {
    let checkerTickets: PretixAtom[];
    let ticketId: string;

    try {
      const payload = await this.unwrapCheckInSignature(request.credential);
      const checkerEmailPCD = await EmailPCDPackage.deserialize(
        payload.emailPCD.pcd
      );

      if (
        !isEqualEdDSAPublicKey(
          checkerEmailPCD.proof.eddsaPCD.claim.publicKey,
          this.zupassPublicKey
        )
      ) {
        logger(
          `${LOG_TAG} Email ${checkerEmailPCD.claim.emailAddress} not signed by Zupass`
        );
        return { canCheckIn: false, error: { name: "InvalidSignature" } };
      }

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
      // Only check if ticket is already checked in here, to avoid leaking
      // information about ticket check-in status to unpermitted users.
      if (ticketAtom.isConsumed) {
        return {
          canCheckIn: false,
          error: {
            name: "AlreadyCheckedIn",
            checkinTimestamp: ticketAtom.timestampConsumed?.toISOString(),
            checker: PRETIX_CHECKER // Pretix does not store a "checker" so use a constant
          }
        };
      }

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
              checkinTimestamp: new Date(
                pendingCheckin.timestamp
              ).toISOString(),
              checker: PRETIX_CHECKER
            }
          };
        }
      }
      return {
        canCheckIn: true,
        eventName: this.atomToEventName(ticketAtom),
        ticketName: this.atomToTicketName(ticketAtom),
        attendeeEmail: ticketAtom.email as string,
        attendeeName: ticketAtom.name
      };
    } else {
      return { canCheckIn: false, error: canCheckInResult };
    }
  }

  /**
   * Perform a check-in.
   * This repeats the checks performed by {@link checkPretixTicketPCDCanBeCheckedIn}
   * and, if successful, records that a pending check-in is underway and sends
   * a check-in API request to Pretix.
   */
  private async checkinPretixTicketPCDs(
    request: GenericIssuanceCheckInRequest
  ): Promise<GenericIssuanceCheckInResponseValue> {
    return traced(LOG_NAME, "checkinPretixTicketPCDs", async (span) => {
      span?.setAttribute("pipeline_id", this.id);
      span?.setAttribute("pipeline_type", this.type);
      logger(
        LOG_TAG,
        `got request to check in tickets with request ${JSON.stringify(
          request
        )}`
      );

      let checkerTickets: PretixAtom[];
      let ticketId: string;

      try {
        const payload = await this.unwrapCheckInSignature(request.credential);
        const checkerEmailPCD = await EmailPCDPackage.deserialize(
          payload.emailPCD.pcd
        );

        if (
          !isEqualEdDSAPublicKey(
            checkerEmailPCD.proof.eddsaPCD.claim.publicKey,
            this.zupassPublicKey
          )
        ) {
          logger(
            `${LOG_TAG} Email ${checkerEmailPCD.claim.emailAddress} not signed by Zupass`
          );
          return { checkedIn: false, error: { name: "InvalidSignature" } };
        }

        checkerTickets = await this.db.loadByEmail(
          this.id,
          checkerEmailPCD.claim.emailAddress
        );
        ticketId = payload.ticketIdToCheckIn;
      } catch (e) {
        span?.setAttribute("checkin_error", "InvalidSignature");
        return { checkedIn: false, error: { name: "InvalidSignature" } };
      }

      const ticketAtom = await this.db.loadById(this.id, ticketId);
      if (!ticketAtom) {
        span?.setAttribute("checkin_error", "InvalidTicket");
        span?.setAttribute("failed_checkin_ticket_id", ticketId);
        return { checkedIn: false, error: { name: "InvalidTicket" } };
      }

      const canCheckInResult = await this.canCheckIn(
        ticketAtom,
        checkerTickets
      );

      if (canCheckInResult === true) {
        if (ticketAtom.isConsumed) {
          span?.setAttribute("checkin_error", "AlreadyCheckedIn");
          span?.setAttribute("failed_checkin_ticket_id", ticketId);
          return {
            checkedIn: false,
            error: {
              name: "AlreadyCheckedIn",
              checkinTimestamp: ticketAtom.timestampConsumed?.toISOString(),
              checker: PRETIX_CHECKER // Pretix does not store a "checker"
            }
          };
        }

        const pretixEventId = this.atomToPretixEventId(ticketAtom);

        let pendingCheckin;
        if ((pendingCheckin = this.pendingCheckIns.get(ticketAtom.id))) {
          if (
            pendingCheckin.status === CheckinStatus.Pending ||
            pendingCheckin.status === CheckinStatus.Success
          ) {
            span?.setAttribute("checkin_error", "AlreadyCheckedIn");
            span?.setAttribute("failed_checkin_ticket_id", ticketId);
            return {
              checkedIn: false,
              error: {
                name: "AlreadyCheckedIn",
                checkinTimestamp: new Date(
                  pendingCheckin.timestamp
                ).toISOString(),
                checker: PRETIX_CHECKER
              }
            };
          }
        }

        try {
          // We fetch this as part of data verification when load()'ing data from
          // Pretix, so perhaps we could cache that data and avoid this API call.
          const checkinLists = await this.api.fetchEventCheckinLists(
            this.definition.options.pretixOrgUrl,
            this.definition.options.pretixAPIKey,
            pretixEventId
          );

          this.pendingCheckIns.set(ticketAtom.id, {
            status: CheckinStatus.Pending,
            timestamp: Date.now()
          });

          await this.api.pushCheckin(
            this.definition.options.pretixOrgUrl,
            this.definition.options.pretixAPIKey,
            ticketAtom.secret,
            checkinLists[0].id.toString(),
            new Date().toISOString()
          );

          this.pendingCheckIns.set(ticketAtom.id, {
            status: CheckinStatus.Success,
            timestamp: Date.now()
          });
        } catch (e) {
          logger(
            `${LOG_TAG} Failed to check in ticket ${ticketAtom.id} for event ${ticketAtom.eventId} on behalf of checker ${checkerTickets[0].email}`
          );
          span?.setAttribute("checkin_error", "ServerError");
          span?.setAttribute("failed_checkin_ticket_id", ticketId);
          return { checkedIn: false, error: { name: "ServerError" } };
        }

        span?.setAttribute("successful_checkin_ticket_id", ticketId);

        return { checkedIn: true };
      } else {
        span?.setAttribute("checkin_error", canCheckInResult.name);
        span?.setAttribute("failed_checkin_ticket_id", ticketAtom.id);
        return { checkedIn: false, error: canCheckInResult };
      }
    });
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

  private atomToPretixEventId(ticketAtom: PretixAtom): string {
    const correspondingEventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceId === ticketAtom.eventId
    );

    if (!correspondingEventConfig) {
      throw new Error("no matching event id");
    }

    return correspondingEventConfig.externalId;
  }

  private atomToPretixProductId(ticketAtom: PretixAtom): string {
    const correspondingEventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceId === ticketAtom.eventId
    );

    if (!correspondingEventConfig) {
      throw new Error("no matching event id");
    }

    const correspondingProductConfig = correspondingEventConfig.products.find(
      (p) => p.genericIssuanceId === ticketAtom.productId
    );

    if (!correspondingProductConfig) {
      throw new Error("no matching product id");
    }

    return correspondingProductConfig.externalId;
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
