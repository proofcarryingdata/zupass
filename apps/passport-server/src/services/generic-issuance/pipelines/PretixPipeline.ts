import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  EdDSATicketPCDTypeName,
  ITicketData,
  TicketCategory,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { getHash } from "@pcd/passport-crypto";
import {
  ActionConfigResponseValue,
  GenericPretixCheckinList,
  GenericPretixEvent,
  GenericPretixEventSettings,
  GenericPretixOrder,
  GenericPretixProduct,
  GenericPretixProductCategory,
  ImageOptions,
  ManualTicket,
  PipelineEdDSATicketZuAuthConfig,
  PipelineLoadSummary,
  PipelineLog,
  PipelineSemaphoreGroupInfo,
  PipelineSetManualCheckInStateResponseValue,
  PipelineType,
  PipelineZuAuthConfig,
  PodboxTicketActionError,
  PodboxTicketActionPreCheckRequest,
  PodboxTicketActionRequest,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  PretixEventConfig,
  PretixPipelineDefinition,
  PretixProductConfig
} from "@pcd/passport-interface";
import { PCDAction, PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  PODTicketPCD,
  PODTicketPCDPackage,
  PODTicketPCDTypeName
} from "@pcd/pod-ticket-pcd";
import { IPODTicketData } from "@pcd/pod-ticket-pcd/src/schema";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { normalizeEmail, str } from "@pcd/util";
import stable_stringify from "fast-json-stable-stringify";
import PQueue from "p-queue";
import { DatabaseError } from "pg";
import { PoolClient } from "postgres-pool";
import { v5 as uuidv5 } from "uuid";
import { IGenericPretixAPI } from "../../../apis/pretix/genericPretixAPI";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { IPipelineCheckinDB } from "../../../database/queries/pipelineCheckinDB";
import { IPipelineConsumerDB } from "../../../database/queries/pipelineConsumerDB";
import { IPipelineDefinitionDB } from "../../../database/queries/pipelineDefinitionDB";
import { IPipelineManualTicketDB } from "../../../database/queries/pipelineManualTicketDB";
import { IPipelineSemaphoreHistoryDB } from "../../../database/queries/pipelineSemaphoreHistoryDB";
import {
  namedSqlTransaction,
  sqlTransaction
} from "../../../database/sqlQuery";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { ApplicationContext } from "../../../types";
import { mostRecentCheckinEvent } from "../../../util/devconnectTicket";
import { logger } from "../../../util/logger";
import { AbortError } from "../../../util/util";
import { LocalFileService } from "../../LocalFileService";
import { PersistentCacheService } from "../../persistentCacheService";
import { setError, traced } from "../../telemetryService";
import {
  AutoIssuanceProvider,
  anyTicketMatchesCriteria
} from "../AutoIssuanceProvider";
import {
  SemaphoreGroupProvider,
  SemaphoreGroupTicketInfo
} from "../SemaphoreGroupProvider";
import {
  CheckinCapability,
  CheckinStatus,
  generateCheckinUrlPath
} from "../capabilities/CheckinCapability";
import {
  FeedIssuanceCapability,
  makeGenericIssuanceFeedUrl
} from "../capabilities/FeedIssuanceCapability";
import { SemaphoreGroupCapability } from "../capabilities/SemaphoreGroupCapability";
import { PipelineCapability } from "../capabilities/types";
import { tracePipeline } from "../honeycombQueries";
import { CredentialSubservice } from "../subservices/CredentialSubservice";
import { BasePipelineCapability } from "../types";
import { makePLogErr, makePLogInfo, makePLogWarn } from "./logging";
import { BasePipeline, Pipeline } from "./types";

const LOG_NAME = "PretixPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export const PRETIX_CHECKER = "Pretix";

const VALID_PRETIX_EVENT_SETTINGS: GenericPretixEventSettings = {
  attendee_emails_asked: true,
  attendee_emails_required: true
};

/**
 * Class encapsulating the complete set of behaviors that a {@link Pipeline} which
 * loads data from Pretix is capable of.
 */
export class PretixPipeline implements BasePipeline {
  public type = PipelineType.Pretix;
  public capabilities: BasePipelineCapability[];

  private stopped = false;
  /**
   * Used to sign {@link EdDSATicketPCD}
   */
  private eddsaPrivateKey: string;
  private definition: PretixPipelineDefinition;
  private cacheService: PersistentCacheService;
  private credentialSubservice: CredentialSubservice;

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
  private pipelineDB: IPipelineDefinitionDB;
  private api: IGenericPretixAPI;
  private checkinDB: IPipelineCheckinDB;
  private consumerDB: IPipelineConsumerDB;
  private manualTicketDB: IPipelineManualTicketDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private semaphoreGroupProvider: SemaphoreGroupProvider | undefined;
  private autoIssuanceProvider: AutoIssuanceProvider | undefined;
  private semaphoreUpdateQueue: PQueue;
  private context: ApplicationContext;
  private abort: AbortController;
  private localFileService: LocalFileService | null;

  public get id(): string {
    return this.definition.id;
  }

  public get issuanceCapability(): FeedIssuanceCapability {
    return this.capabilities[0] as FeedIssuanceCapability;
  }

  public get checkinCapability(): CheckinCapability {
    return this.capabilities[1] as CheckinCapability;
  }

  public get semaphoreGroupCapability(): SemaphoreGroupCapability {
    return this.capabilities[2] as SemaphoreGroupCapability;
  }

  public constructor(
    eddsaPrivateKey: string,
    definition: PretixPipelineDefinition,
    db: IPipelineAtomDB,
    pipelineDB: IPipelineDefinitionDB,
    api: IGenericPretixAPI,
    credentialSubservice: CredentialSubservice,
    cacheService: PersistentCacheService,
    checkinDB: IPipelineCheckinDB,
    consumerDB: IPipelineConsumerDB,
    manualTicketDB: IPipelineManualTicketDB,
    semaphoreHistoryDB: IPipelineSemaphoreHistoryDB,
    context: ApplicationContext,
    localFileService: LocalFileService | null
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<PretixAtom>;
    this.pipelineDB = pipelineDB;
    this.api = api;
    this.consumerDB = consumerDB;
    this.manualTicketDB = manualTicketDB;
    this.semaphoreHistoryDB = semaphoreHistoryDB;
    this.context = context;
    this.localFileService = localFileService;

    if ((this.definition.options.semaphoreGroups ?? []).length > 0) {
      this.semaphoreGroupProvider = new SemaphoreGroupProvider(
        this.context,
        this.id,
        this.definition.options.semaphoreGroups ?? [],
        consumerDB,
        semaphoreHistoryDB
      );
    }
    this.capabilities = [
      {
        issue: this.issuePretixTicketPCDs.bind(this),
        options: this.definition.options.feedOptions,
        type: PipelineCapability.FeedIssuance,
        feedUrl: makeGenericIssuanceFeedUrl(
          this.id,
          this.definition.options.feedOptions.feedId
        ),
        getZuAuthConfig: this.getZuAuthConfig.bind(this)
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
        preCheck: this.checkPretixTicketPCDCanBeCheckedIn.bind(this),
        getManualCheckinSummary: async (): Promise<never[]> => [],
        userCanCheckIn: async (): Promise<boolean> => false,
        setManualCheckInState:
          (): Promise<PipelineSetManualCheckInStateResponseValue> => {
            throw new Error("No implemented");
          }
      } satisfies CheckinCapability,
      {
        type: PipelineCapability.SemaphoreGroup,
        getSerializedLatestGroup: async (
          groupId: string
        ): Promise<SerializedSemaphoreGroup | undefined> => {
          return sqlTransaction(
            this.context.dbPool,
            async (client) =>
              this.semaphoreGroupProvider?.getSerializedLatestGroup(
                client,
                groupId
              )
          );
        },
        getLatestGroupRoot: async (
          groupId: string
        ): Promise<string | undefined> => {
          return sqlTransaction(
            this.context.dbPool,
            async (client) =>
              this.semaphoreGroupProvider?.getLatestGroupRoot(client, groupId)
          );
        },
        getSerializedHistoricalGroup: async (
          groupId: string,
          rootHash: string
        ): Promise<SerializedSemaphoreGroup | undefined> => {
          return sqlTransaction(
            this.context.dbPool,
            async (client) =>
              this.semaphoreGroupProvider?.getSerializedHistoricalGroup(
                client,
                groupId,
                rootHash
              )
          );
        },
        getSupportedGroups: (): PipelineSemaphoreGroupInfo[] => {
          return this.semaphoreGroupProvider?.getSupportedGroups() ?? [];
        }
      } satisfies SemaphoreGroupCapability
    ] as unknown as BasePipelineCapability[];
    this.pendingCheckIns = new Map();
    this.cacheService = cacheService;
    this.checkinDB = checkinDB;
    this.semaphoreUpdateQueue = new PQueue({ concurrency: 1 });
    this.credentialSubservice = credentialSubservice;
    this.abort = new AbortController();
  }

  public isStopped(): boolean {
    return this.stopped;
  }

  public async start(): Promise<void> {
    if (this.stopped) {
      throw new Error(`pipeline ${this.id} already stopped`);
    }
    logger(`starting pretix pipeline with id ${this.definition.id}`);
    await sqlTransaction(this.context.dbPool, (client) =>
      this.cleanUpManualCheckins(client)
    );
    await this.semaphoreGroupProvider?.start();
  }

  public async stop(): Promise<void> {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    logger(LOG_TAG, `stopping PretixPipeline with id ${this.id}`);
    this.abort.abort();
  }

  /**
   * Loads external data from Lemonade and saves it to the {@link IPipelineAtomDB} for
   * later use.
   *
   * TODO:
   * - clear tickets after each load? important!!!!
   */
  public async load(): Promise<PipelineLoadSummary> {
    return traced<PipelineLoadSummary>(
      LOG_NAME,
      "load",
      async (span): Promise<PipelineLoadSummary> => {
        tracePipeline(this.definition);
        const startTime = new Date();
        const logs: PipelineLog[] = [];

        logger(
          LOG_TAG,
          `loading for pipeline id ${this.id} with type ${this.type}`
        );
        logs.push(makePLogInfo(`loading data for pipeline '${this.id}'`));
        logs.push(
          makePLogInfo(
            `events are '${str(
              this.definition.options.events.map((e): string => {
                return `${e.name} ('${e.externalId}')`;
              })
            )}'`
          )
        );

        const tickets: PretixTicket[] = [];
        const errors: string[] = [];

        for (const event of this.definition.options.events) {
          logs.push(
            makePLogInfo(
              `products for ${event.name} are '${str(
                event.products.map((p): string => {
                  return `${p.name} ('${p.externalId}')`;
                })
              )}'`
            )
          );

          const eventData = await this.loadEvent(event);
          logs.push(makePLogInfo(`loaded event data for ${event.externalId}`));

          const validationErrors = this.validateEventData(eventData, event);
          logs.push(...validationErrors.warnings.map((e) => makePLogWarn(e)));
          logs.push(...validationErrors.errors.map((e) => makePLogErr(e)));
          errors.push(...validationErrors.errors);

          tickets.push(...(await this.ordersToTickets(event, eventData, logs)));
        }

        if (errors.length > 0) {
          span?.setAttribute("error_count", errors);
          logger(
            LOG_TAG,
            `failed to load Pretix pipeline '${this.id}' of type '${
              this.type
            }'; errors: ${str(errors)}`
          );

          return {
            fromCache: false,
            paused: false,
            atomsLoaded: 0,
            atomsExpected: 0,
            lastRunEndTimestamp: new Date().toISOString(),
            lastRunStartTimestamp: startTime.toISOString(),
            latestLogs: logs,
            success: false
          };
        }

        if (this.abort.signal.aborted) {
          throw new AbortError(`pipeline ${this.id} load aborted`);
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
            isConsumed: !!ticket.pretix_checkin_timestamp,
            orderCode: ticket.order_code,
            parentAtomId: ticket.addon_to_position_id
              ? uuidv5(
                  ticket.addon_to_position_id,
                  ticket.event.genericIssuanceId
                )
              : null
          };
        });

        // Make a map from atom id to atom
        const atomMap = new Map<string, PretixAtom>();
        atomsToSave.forEach((a) => {
          atomMap.set(a.id, a);
        });

        // For each atom, if it has a parentAtomId, set the email to the parent atom's email
        atomsToSave.forEach((a) => {
          if (a.parentAtomId) {
            const parentAtom = atomMap.get(a.parentAtomId);
            if (parentAtom) {
              a.email = parentAtom.email;
            } else {
              logger(
                LOG_TAG,
                `parent atom ${a.parentAtomId} not found for atom ${a.id} in pipeline ${this.id}`
              );
            }
          }
        });

        logger(
          LOG_TAG,
          `saving ${atomsToSave.length} atoms for pipeline id '${this.id}' of type ${this.type}`
        );

        return namedSqlTransaction(
          this.context.dbPool,
          "load",
          async (client) => {
            if (this.autoIssuanceProvider) {
              const newManualTickets =
                await this.autoIssuanceProvider.dripNewManualTickets(
                  client,
                  this.consumerDB,
                  await this.getAllManualTickets(client),
                  atomsToSave
                );

              await Promise.allSettled(
                newManualTickets.map((t) =>
                  this.manualTicketDB.save(client, this.id, t)
                )
              );
            }

            await this.db.clear(this.definition.id);
            await this.db.save(this.definition.id, atomsToSave);
            await this.db.markAsLoaded(this.id);

            logs.push(makePLogInfo(`saved ${atomsToSave.length} items`));

            const loadEnd = Date.now();

            logger(
              LOG_TAG,
              `loaded ${atomsToSave.length} atoms for pipeline id ${
                this.id
              } in ${loadEnd - startTime.getTime()}ms`
            );

            span?.setAttribute("atoms_saved", atomsToSave.length);

            // Remove any pending check-ins that succeeded before loading started.
            // Those that succeeded after loading started might not be represented in
            // the data we fetched, so we can remove them on the next run.
            // Pending checkins with the "Pending" status should not be removed, as
            // they are still in-progress.
            this.pendingCheckIns.forEach((value, key) => {
              if (
                value.status === CheckinStatus.Success &&
                value.timestamp <= startTime.getTime()
              ) {
                this.pendingCheckIns.delete(key);
              }
            });

            const end = new Date();
            logs.push(
              makePLogInfo(
                `load finished in ${end.getTime() - startTime.getTime()}ms`
              )
            );

            if ((this.definition.options.semaphoreGroups ?? []).length > 0) {
              await this.triggerSemaphoreGroupUpdate(client);
            }

            const loadSummary: PipelineLoadSummary = {
              paused: false,
              fromCache: false,
              lastRunEndTimestamp: end.toISOString(),
              lastRunStartTimestamp: startTime.toISOString(),
              latestLogs: logs,
              atomsLoaded: atomsToSave.length,
              atomsExpected: atomsToSave.length,
              errorMessage: undefined,
              semaphoreGroups:
                this.semaphoreGroupProvider?.getSupportedGroups(),
              success: true
            };

            return loadSummary;
          }
        );
      }
    );
  }

  private async getAllManualTickets(
    client: PoolClient
  ): Promise<ManualTicket[]> {
    return (this.definition.options.manualTickets ?? []).concat(
      await this.manualTicketDB.loadAll(client, this.id)
    );
  }

  /**
   * Collects data that is require for Semaphore groups to update.
   * Returns an array of { eventId, productId, email } objects, which the
   * SemaphoreGroupProvider will use to look up Semaphore IDs and match them
   * to configured Semaphore groups.
   */
  private async semaphoreGroupData(
    client: PoolClient
  ): Promise<SemaphoreGroupTicketInfo[]> {
    return traced(LOG_NAME, "semaphoreGroupData", async (span) => {
      const data = [];
      for (const atom of await this.db.load(this.id)) {
        data.push({
          email: atom.email as string,
          eventId: atom.eventId,
          productId: atom.productId
        });
      }

      for (const manualTicket of await this.getAllManualTickets(client)) {
        data.push({
          email: manualTicket.attendeeEmail,
          eventId: manualTicket.eventId,
          productId: manualTicket.productId
        });
      }

      span?.setAttribute("ticket_data_length", data.length);

      return data;
    });
  }

  public async triggerSemaphoreGroupUpdate(client: PoolClient): Promise<void> {
    return traced(LOG_NAME, "triggerSemaphoreGroupUpdate", async (_span) => {
      tracePipeline(this.definition);
      // Whenever an update is triggered, we want to make sure that the
      // fetching of data and the actual update are atomic.
      // If there were two concurrenct updates, it might be possible for them
      // to use slightly different data sets, but send them to the `update`
      // method in the wrong order, producing unexpected outcomes. Although the
      // group diffing mechanism would eventually cause the group to converge
      // on the correct membership, we can avoid any temporary inconsistency by
      // queuing update requests.
      // By returning this promise, we allow the caller to await on the update
      // having been processed.
      return this.semaphoreUpdateQueue.add(async () => {
        const data = await this.semaphoreGroupData(client);
        await this.semaphoreGroupProvider?.update(client, data);
      });
    });
  }

  /**
   * If manual tickets are removed after being checked in, they can leave
   * orphaned check-in data behind. This method cleans those up.
   */
  private async cleanUpManualCheckins(client: PoolClient): Promise<void> {
    return traced(LOG_NAME, "cleanUpManualCheckins", async (span) => {
      const ticketIds = new Set(
        (await this.getAllManualTickets(client)).map(
          (manualTicket) => manualTicket.id
        )
      );
      const checkIns = await this.checkinDB.getByPipelineId(client, this.id);
      for (const checkIn of checkIns) {
        if (!ticketIds.has(checkIn.ticketId)) {
          logger(
            `${LOG_TAG} Deleting orphaned check-in for ${checkIn.ticketId} on pipeline ${this.id}`
          );
          span?.setAttribute("deleted_checkin_ticket_id", checkIn.ticketId);

          await this.checkinDB.deleteCheckIn(client, this.id, checkIn.ticketId);
        }
      }
    });
  }

  /**
   * Loads data from Pretix for a single event.
   * Some of this data is used to create tickets, and other data is loaded for
   * the purpose of validating that Pretix is correctly configured.
   */
  private async loadEvent(event: PretixEventConfig): Promise<PretixEventData> {
    return traced(LOG_NAME, "loadEvent", async () => {
      tracePipeline(this.definition);
      logger(LOG_TAG, `loadEvent`, event);

      const orgUrl = this.definition.options.pretixOrgUrl;
      const token = this.definition.options.pretixAPIKey;
      const eventId = event.externalId;
      let settings: GenericPretixEventSettings;
      // When settings validation is skipped, return a valid configuration
      // rather than calling the API
      if (event.skipSettingsValidation) {
        settings = VALID_PRETIX_EVENT_SETTINGS;
      } else {
        settings = await this.api.fetchEventSettings(
          orgUrl,
          token,
          eventId,
          this.abort
        );
      }
      const categories = await this.api.fetchProductCategories(
        orgUrl,
        token,
        eventId,
        this.abort
      );
      const products = await this.api.fetchProducts(
        orgUrl,
        token,
        eventId,
        this.abort
      );
      const eventInfo = await this.api.fetchEvent(
        orgUrl,
        token,
        eventId,
        this.abort
      );
      const orders = await this.api.fetchOrders(
        orgUrl,
        token,
        eventId,
        this.definition.options.batchFetch ?? false,
        this.abort
      );
      const checkinLists = await this.api.fetchEventCheckinLists(
        orgUrl,
        token,
        eventId,
        this.abort
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
  ): { warnings: string[]; errors: string[] } {
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
    const warnings: string[] = [];
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
      warnings.push(
        `Active items with ID(s) "${activeItemDiff.join(
          ", "
        )}" are present in config but not in data fetched from Pretix for event ${
          eventConfig.genericIssuanceId
        }`
      );
    }

    if (superuserItemDiff.length > 0) {
      warnings.push(
        `Superuser items with ID(s) "${superuserItemDiff.join(
          ", "
        )}" are present in config but not in data fetched from Pretix for event ${
          eventConfig.genericIssuanceId
        }`
      );
    }

    // @todo: we should probably allow for multiple check-in lists, and then
    // we'd need to handle them here.
    // if (eventData.checkinLists.length > 1) {
    //   errors.push(
    //     `Event "${eventData.eventInfo.name.en}" (${eventConfig.genericIssuanceId}) has multiple check-in lists`
    //   );
    // }

    if (eventData.checkinLists.length < 1) {
      errors.push(
        `Event "${eventData.eventInfo.name.en}" (${eventConfig.genericIssuanceId}) has no check-in lists`
      );
    }

    return { warnings, errors };
  }

  /**
   * Converts a given list of orders to tickets.
   */
  private async ordersToTickets(
    eventConfig: PretixEventConfig,
    eventData: PretixEventData,
    logs?: PipelineLog[]
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
      for (const position of order.positions) {
        const {
          id,
          item,
          attendee_name,
          attendee_email,
          secret,
          checkins,
          answers,
          addon_to
        } = position;

        const product = products.get(item.toString());

        const nameQuestionAnswer = answers?.find(
          (a) =>
            product?.nameQuestionPretixQuestionIdentitifier &&
            a?.question_identifier ===
              product?.nameQuestionPretixQuestionIdentitifier
        )?.answer;

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

          if (pretix_checkin_timestamp_string !== null) {
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

          const resolvedName =
            nameQuestionAnswer ?? attendee_name ?? order.name ?? "";

          if (resolvedName === "") {
            logs?.push(
              makePLogWarn(
                `no resolved name for ticket id '${str(
                  id
                )}' with email '${email}'`
              )
            );
          }

          tickets.push({
            email,
            product,
            event: eventConfig,
            full_name: resolvedName,
            is_consumed: pretix_checkin_timestamp !== null,
            position_id: id.toString(),
            secret,
            pretix_checkin_timestamp,
            order_code: order.code,
            addon_to_position_id: addon_to?.toString() ?? null
          });
        }
      }
    }
    return tickets;
  }

  private async manualTicketToTicketData(
    client: PoolClient,
    manualTicket: ManualTicket,
    sempahoreId: string
  ): Promise<ITicketData> {
    const event = this.getEventById(manualTicket.eventId);
    const product = this.getProductById(event, manualTicket.productId);

    const checkIn = await this.checkinDB.getByTicketId(
      client,
      this.id,
      manualTicket.id
    );

    return {
      ticketId: manualTicket.id,
      eventId: manualTicket.eventId,
      productId: manualTicket.productId,
      attendeeEmail: manualTicket.attendeeEmail,
      attendeeName: manualTicket.attendeeName,
      attendeeSemaphoreId: sempahoreId,
      imageUrl: this.imageOptionsToImageUrl(event.imageOptions, !!checkIn),
      qrCodeOverrideImageUrl: event.imageOptions?.qrCodeOverrideImageUrl,
      eventStartDate: event.imageOptions?.eventStartDate,
      eventLocation: event.imageOptions?.eventLocation,
      isAddOn: product.isAddOnItem,
      isConsumed: checkIn ? true : false,
      isRevoked: false,
      timestampSigned: Date.now(),
      timestampConsumed: checkIn ? checkIn.timestamp.getTime() : 0,
      ticketCategory: TicketCategory.Generic,
      eventName: event.name,
      ticketName: product.name,
      checkerEmail: undefined
    };
  }

  private async manualTicketToPODTicketData(
    client: PoolClient,
    manualTicket: ManualTicket,
    semaphoreV4Id: string
  ): Promise<IPODTicketData> {
    const event = this.getEventById(manualTicket.eventId);
    const product = this.getProductById(event, manualTicket.productId);

    const checkIn = await this.checkinDB.getByTicketId(
      client,
      this.id,
      manualTicket.id
    );

    return {
      ticketId: manualTicket.id,
      eventId: manualTicket.eventId,
      productId: manualTicket.productId,
      attendeeEmail: manualTicket.attendeeEmail,
      attendeeName: manualTicket.attendeeName,
      imageUrl: this.imageOptionsToImageUrl(event.imageOptions, !!checkIn),
      qrCodeOverrideImageUrl: event.imageOptions?.qrCodeOverrideImageUrl,
      eventStartDate: event.imageOptions?.eventStartDate,
      eventLocation: event.imageOptions?.eventLocation,
      isAddOn: product.isAddOnItem,
      isConsumed: checkIn ? true : false,
      isRevoked: false,
      timestampSigned: Date.now(),
      timestampConsumed: checkIn ? checkIn.timestamp.getTime() : 0,
      ticketCategory: TicketCategory.Generic,
      eventName: event.name,
      ticketName: product.name,
      checkerEmail: undefined,
      owner: semaphoreV4Id,
      ticketSecret: undefined
    };
  }

  private async getManualTicketsForEmail(
    client: PoolClient,
    email: string
  ): Promise<ManualTicket[]> {
    return (await this.getAllManualTickets(client)).filter((manualTicket) => {
      return manualTicket.attendeeEmail.toLowerCase() === email.toLowerCase();
    });
  }

  private async getManualTicketById(
    client: PoolClient,
    id: string
  ): Promise<ManualTicket | undefined> {
    return (await this.getAllManualTickets(client)).find(
      (manualTicket) => manualTicket.id === id
    );
  }

  /**
   * Retrieves all tickets for a single email address, including both tickets
   * from the Pretix backend and manually-specified tickets from the Pipeline
   * definition.
   */
  private async getEdDSATicketsForEmail(
    client: PoolClient,
    email: string,
    identityCommitment: string
  ): Promise<EdDSATicketPCD[]> {
    // Load atom-backed tickets
    const relevantTickets = await this.db.loadByEmail(this.id, email);
    // Convert atoms to ticket data
    const ticketDatas = relevantTickets.map((t) =>
      this.atomToEdDSATicketData(t, identityCommitment)
    );
    // Load manual tickets from the definition
    const manualTickets = await this.getManualTicketsForEmail(client, email);

    // Convert manual tickets to ticket data and add to array
    ticketDatas.push(
      ...(await Promise.all(
        manualTickets.map((manualTicket) =>
          this.manualTicketToTicketData(
            client,
            manualTicket,
            identityCommitment
          )
        )
      ))
    );

    // Turn ticket data into PCDs
    const tickets = await Promise.all(
      ticketDatas.map((t) => this.getOrGenerateTicket(t))
    );

    return tickets;
  }

  /**
   * Retrieves all tickets for a single email address, including both tickets
   * from the Pretix backend and manually-specified tickets from the Pipeline
   * definition.
   */
  private async getPODTicketsForEmail(
    client: PoolClient,
    email: string,
    semaphoreV4Id: string
  ): Promise<PODTicketPCD[]> {
    // Load atom-backed tickets
    const relevantTickets = await this.db.loadByEmail(this.id, email);
    // Convert atoms to ticket data
    const ticketDatas: IPODTicketData[] = relevantTickets.map((t) =>
      this.atomToPODTicketData(t, semaphoreV4Id)
    );
    // Load manual tickets from the definition
    const manualTickets = await this.getManualTicketsForEmail(client, email);

    // Convert manual tickets to ticket data and add to array
    ticketDatas.push(
      ...(await Promise.all(
        manualTickets.map((manualTicket) =>
          this.manualTicketToPODTicketData(client, manualTicket, semaphoreV4Id)
        )
      ))
    );

    // Turn ticket data into PCDs
    const tickets = await Promise.all(
      ticketDatas.map((t) => this.getOrGeneratePODTicket(t))
    );

    return tickets;
  }

  private async issuePretixTicketPCDs(
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return traced(LOG_NAME, "issuePretixTicketPCDs", async (span) => {
      tracePipeline(this.definition);

      if (!req.pcd) {
        throw new Error("missing credential pcd");
      }

      if (
        this.definition.options.paused &&
        !(await this.db.hasLoaded(this.id))
      ) {
        return { actions: [] };
      }

      const { emails, semaphoreId } =
        await this.credentialSubservice.verifyAndExpectZupassEmail(req.pcd);

      if (!emails || emails.length === 0) {
        throw new Error("missing emails in credential");
      }

      span?.setAttribute("email", emails.map((e) => e.email).join(","));
      span?.setAttribute("semaphore_id", semaphoreId);

      let didUpdate = false;

      return namedSqlTransaction(this.context.dbPool, "", async (client) => {
        for (const e of emails) {
          didUpdate =
            didUpdate ||
            (await this.consumerDB.save(
              client,
              this.id,
              e.email,
              semaphoreId,
              new Date()
            ));
        }

        const provider = this.autoIssuanceProvider;
        if (provider) {
          const newManualTickets = (
            await Promise.all(
              emails.map(async (e) =>
                provider.maybeIssueForUser(
                  e.email,
                  await this.getAllManualTickets(client),
                  await this.db.loadByEmail(this.id, e.email)
                )
              )
            )
          ).flat();

          await Promise.allSettled(
            newManualTickets.map((t) =>
              this.manualTicketDB.save(client, this.id, t)
            )
          );
        }

        // If the user's Semaphore commitment has changed, `didUpdate` will be
        // true, and we need to update the Semaphore groups
        if ((this.definition.options.semaphoreGroups ?? []).length > 0) {
          if (didUpdate) {
            span?.setAttribute("semaphore_groups_updated", true);
            await this.triggerSemaphoreGroupUpdate(client);
          }
        }

        const tickets = (
          await Promise.all(
            emails.map((e) =>
              this.getEdDSATicketsForEmail(client, e.email, semaphoreId)
            )
          )
        ).flat();

        span?.setAttribute("pcds_issued", tickets.length);

        const actions: PCDAction[] = [];

        if (await this.db.hasLoaded(this.id)) {
          actions.push({
            type: PCDActionType.DeleteFolder,
            folder: this.definition.options.feedOptions.feedFolder,
            recursive: true
          });
        }

        const ticketPCDs = await Promise.all(
          tickets.map((t) => EdDSATicketPCDPackage.serialize(t))
        );

        if (this.definition.options.enablePODTickets) {
          const podTickets = (
            await Promise.all(
              emails.map((e) =>
                e.semaphoreV4Id
                  ? this.getPODTicketsForEmail(client, e.email, e.semaphoreV4Id)
                  : undefined
              )
            )
          )
            .flat()
            .filter((t) => t !== undefined) as PODTicketPCD[];

          ticketPCDs.push(
            ...(await Promise.all(
              podTickets.map((t) => PODTicketPCDPackage.serialize(t))
            ))
          );
        }

        actions.push({
          type: PCDActionType.ReplaceInFolder,
          folder: this.definition.options.feedOptions.feedFolder,
          pcds: ticketPCDs
        });

        const result: PollFeedResponseValue = { actions };

        return result;
      });
    });
  }

  public atomToPODTicketData(
    atom: PretixAtom,
    semaphoreV4Id: string
  ): IPODTicketData {
    if (!atom.email) {
      throw new Error(`Atom missing email: ${atom.id} in pipeline ${this.id}`);
    }

    return {
      attendeeName: atom.name,
      attendeeEmail: atom.email,
      eventName: this.atomToEventName(atom),
      ticketName: this.atomToTicketName(atom),
      checkerEmail: undefined,
      ticketSecret: atom.secret,
      ticketId: atom.id,
      eventId: atom.eventId,
      productId: atom.productId,
      timestampConsumed: atom.timestampConsumed?.getTime() ?? 0,
      timestampSigned: Date.now(),
      owner: semaphoreV4Id,
      imageUrl: this.atomToImageUrl(atom),
      qrCodeOverrideImageUrl: this.atomToQrCodeOverrideImageUrl(atom),
      eventStartDate: this.atomToEventStartDate(atom),
      eventLocation: this.atomToEventLocation(atom),
      isAddOn: !!atom.parentAtomId,
      isConsumed: atom.isConsumed,
      isRevoked: false,
      ticketCategory: TicketCategory.Generic,
      parentTicketId: atom.parentAtomId ?? undefined
    };
  }

  private atomToEdDSATicketData(
    atom: PretixAtom,
    semaphoreId: string
  ): ITicketData {
    if (!atom.email) {
      throw new Error(`Atom missing email: ${atom.id} in pipeline ${this.id}`);
    }

    return {
      // unsigned fields
      attendeeName: atom.name,
      attendeeEmail: atom.email,
      eventName: this.atomToEventName(atom),
      ticketName: this.atomToTicketName(atom),
      checkerEmail: undefined,
      ticketSecret: atom.secret,

      // signed fields
      ticketId: atom.id,
      eventId: atom.eventId,
      productId: atom.productId,
      timestampConsumed: atom.timestampConsumed?.getTime() ?? 0,
      timestampSigned: Date.now(),
      attendeeSemaphoreId: semaphoreId,
      imageUrl: this.atomToImageUrl(atom),
      qrCodeOverrideImageUrl: this.atomToQrCodeOverrideImageUrl(atom),
      eventStartDate: this.atomToEventStartDate(atom),
      eventLocation: this.atomToEventLocation(atom),
      isAddOn: !!atom.parentAtomId,
      isConsumed: atom.isConsumed,
      isRevoked: false,
      ticketCategory: TicketCategory.Generic,
      parentTicketId: atom.parentAtomId ?? undefined
    };
  }

  private async getOrGenerateTicket(
    ticketData: ITicketData
  ): Promise<EdDSATicketPCD> {
    return traced(LOG_NAME, "getOrGenerateTicket", async (span) => {
      span?.setAttribute("ticket_id", ticketData.ticketId);
      span?.setAttribute("ticket_email", ticketData.attendeeEmail);
      span?.setAttribute("ticket_name", ticketData.attendeeName);

      const cachedTicket = await this.getCachedEdDSATicket(ticketData);
      if (cachedTicket) {
        span?.setAttribute("from_cache", true);
        return cachedTicket;
      }

      logger(
        `${LOG_TAG} cache miss for ticket id ${ticketData.ticketId} on pipeline ${this.id}`
      );

      const generatedTicket = await this.ticketDataToEdDSATicketPCD(
        ticketData,
        this.eddsaPrivateKey
      );

      try {
        this.cacheEdDSATicket(generatedTicket);
      } catch (e) {
        logger(
          `${LOG_TAG} error caching ticket ${ticketData.ticketId} ` +
            `${ticketData.attendeeEmail} for ${ticketData.eventId} (${ticketData.eventName}) on pipeline ${this.id}`
        );
      }

      return generatedTicket;
    });
  }

  private async getOrGeneratePODTicket(
    ticketData: IPODTicketData
  ): Promise<PODTicketPCD> {
    return traced(
      LOG_NAME,
      "getOrGeneratePODTicket",
      async (span): Promise<PODTicketPCD> => {
        span?.setAttribute("ticket_id", ticketData.ticketId);
        span?.setAttribute("ticket_email", ticketData.attendeeEmail);
        span?.setAttribute("ticket_name", ticketData.attendeeName);

        const cachedTicket = await this.getCachedPODTicket(ticketData);
        if (cachedTicket) {
          span?.setAttribute("from_cache", true);
          return cachedTicket;
        }

        logger(
          `${LOG_TAG} cache miss for ticket id ${ticketData.ticketId} on pipeline ${this.id}`
        );

        const generatedTicket = await this.ticketDataToPODTicketPCD(
          ticketData,
          this.eddsaPrivateKey
        );

        try {
          this.cachePODTicket(generatedTicket);
        } catch (e) {
          logger(
            `${LOG_TAG} error caching ticket ${ticketData.ticketId} ` +
              `${ticketData.attendeeEmail} for ${ticketData.eventId} (${ticketData.eventName}) on pipeline ${this.id}`
          );
        }

        return generatedTicket;
      }
    );
  }

  private static async getEdDSATicketCacheKey(
    ticketData: ITicketData,
    eddsaPrivateKey: string,
    pipelineId: string
  ): Promise<string> {
    const ticketCopy: Partial<ITicketData> = { ...ticketData };
    // the reason we remove `timestampSigned` from the cache key
    // is that it changes every time we instantiate `ITicketData`
    // for a particular ticket, rendering the caching ineffective.
    delete ticketCopy.timestampSigned;
    const hash = await getHash(
      stable_stringify(ticketCopy) +
        "2" +
        eddsaPrivateKey +
        pipelineId +
        EdDSATicketPCDTypeName
    );
    return hash;
  }

  private static async getPODTicketCacheKey(
    ticketData: IPODTicketData,
    eddsaPrivateKey: string,
    pipelineId: string
  ): Promise<string> {
    const ticketCopy: Partial<IPODTicketData> = { ...ticketData };
    // the reason we remove `timestampSigned` from the cache key
    // is that it changes every time we instantiate `ITicketData`
    // for a particular ticket, rendering the caching ineffective.
    delete ticketCopy.timestampSigned;
    const hash = await getHash(
      stable_stringify(ticketCopy) +
        "3" +
        eddsaPrivateKey +
        pipelineId +
        PODTicketPCDTypeName
    );
    return hash;
  }

  private async cacheEdDSATicket(ticket: EdDSATicketPCD): Promise<void> {
    const key = await PretixPipeline.getEdDSATicketCacheKey(
      ticket.claim.ticket,
      this.eddsaPrivateKey,
      this.id
    );
    const serialized = isEdDSATicketPCD(ticket)
      ? await EdDSATicketPCDPackage.serialize(ticket)
      : await PODTicketPCDPackage.serialize(ticket);
    this.cacheService.setValue(key, JSON.stringify(serialized));
  }

  private async cachePODTicket(ticket: PODTicketPCD): Promise<void> {
    const key = await PretixPipeline.getPODTicketCacheKey(
      ticket.claim.ticket,
      this.eddsaPrivateKey,
      this.id
    );
    const serialized = isEdDSATicketPCD(ticket)
      ? await EdDSATicketPCDPackage.serialize(ticket)
      : await PODTicketPCDPackage.serialize(ticket);
    this.cacheService.setValue(key, JSON.stringify(serialized));
  }

  private async getCachedEdDSATicket(
    ticketData: ITicketData
  ): Promise<EdDSATicketPCD | undefined> {
    const key = await PretixPipeline.getEdDSATicketCacheKey(
      ticketData,
      this.eddsaPrivateKey,
      this.id
    );
    const serializedTicket = await this.cacheService.getValue(key);
    if (!serializedTicket) {
      logger(
        `${LOG_TAG} cache miss for ticket id ${ticketData.ticketId} on pipeline ${this.id}`
      );
      return undefined;
    }

    try {
      logger(
        `${LOG_TAG} cache hit for ticket id ${ticketData.ticketId} on pipeline ${this.id}`
      );
      const parsedTicket = JSON.parse(serializedTicket.cache_value);
      const deserializedTicket = await EdDSATicketPCDPackage.deserialize(
        parsedTicket.pcd
      );
      return deserializedTicket;
    } catch (e) {
      logger(
        `${LOG_TAG} failed to parse cached ticket ${key} on pipeline ${this.id}`,
        e
      );
      return undefined;
    }
  }

  private async getCachedPODTicket(
    ticketData: IPODTicketData
  ): Promise<PODTicketPCD | undefined> {
    const key = await PretixPipeline.getPODTicketCacheKey(
      ticketData,
      this.eddsaPrivateKey,
      this.id
    );
    const serializedTicket = await this.cacheService.getValue(key);
    if (!serializedTicket) {
      logger(
        `${LOG_TAG} cache miss for ticket id ${ticketData.ticketId} on pipeline ${this.id}`
      );
      return undefined;
    }

    try {
      logger(
        `${LOG_TAG} cache hit for ticket id ${ticketData.ticketId} on pipeline ${this.id}`
      );
      const parsedTicket = JSON.parse(serializedTicket.cache_value);
      const deserializedTicket = await PODTicketPCDPackage.deserialize(
        parsedTicket.pcd
      );
      return deserializedTicket;
    } catch (e) {
      logger(
        `${LOG_TAG} failed to parse cached ticket ${key} on pipeline ${this.id}`,
        e
      );
      return undefined;
    }
  }

  private async ticketDataToEdDSATicketPCD(
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

  private async ticketDataToPODTicketPCD(
    ticketData: IPODTicketData,
    eddsaPrivateKey: string
  ): Promise<PODTicketPCD> {
    const stableId = await getHash(
      `issued-pod-ticket-${this.id}-${ticketData.ticketId}`
    );

    const ticketPCD = await PODTicketPCDPackage.prove({
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
   * Given an event and a checker email, verifies that the checker can perform
   * check-ins for the event.
   *
   * Returns true if the user has the permission to check the ticket in, or an
   * error if not.
   */
  private async canCheckInForEvent(
    client: PoolClient,
    eventId: string,
    productId: string,
    checkerEmails: string[]
  ): Promise<true | PodboxTicketActionError> {
    const eventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceId === eventId
    );

    if (!eventConfig) {
      return { name: "InvalidTicket" };
    }

    const realCheckerTickets = (
      await Promise.all(
        checkerEmails.map((e) => this.db.loadByEmail(this.id, e))
      )
    ).flat();
    const manualCheckerTickets = (
      await Promise.all(
        checkerEmails.map((e) => this.getManualTicketsForEmail(client, e))
      )
    ).flat();

    // Collect all of the product IDs that the checker owns for this event
    const checkerProductIds: string[] = [];

    for (const checkerTicketAtom of realCheckerTickets) {
      if (checkerTicketAtom.eventId === eventId) {
        checkerProductIds.push(checkerTicketAtom.productId);
      }
    }
    for (const manualTicket of manualCheckerTickets) {
      if (manualTicket.eventId === eventConfig.genericIssuanceId) {
        checkerProductIds.push(manualTicket.productId);
      }
    }

    const hasSuperUserTicket = checkerProductIds.some((productId) => {
      return eventConfig.products.find(
        (product) =>
          product.isSuperUser && product.genericIssuanceId === productId
      );
    });

    if (hasSuperUserTicket) {
      return true;
    }

    if (this.definition.options.userPermissions) {
      const matchingPermission = this.definition.options.userPermissions.find(
        (policy) => {
          if (policy.canCheckIn.eventId !== eventId) {
            return false;
          }

          if (
            policy.canCheckIn.productId &&
            policy.canCheckIn.productId !== productId
          ) {
            return false;
          }

          const checkerPolicymatch = anyTicketMatchesCriteria(
            [...realCheckerTickets, ...manualCheckerTickets],
            policy.members
          );

          return checkerPolicymatch;
        }
      );

      if (matchingPermission) {
        return true;
      }
    }

    return { name: "NotSuperuser" };
  }

  private async canCheckInPretixTicket(
    ticketAtom: PretixAtom
  ): Promise<true | PodboxTicketActionError> {
    return traced(LOG_NAME, "canCheckInPretixTicket", async (span) => {
      // Is the ticket already checked in?
      // Only check if ticket is already checked in here, to avoid leaking
      // information about ticket check-in status to unpermitted users.
      if (ticketAtom.timestampConsumed instanceof Date) {
        span?.setAttribute("precheck_error", "AlreadyCheckedIn");
        return {
          name: "AlreadyCheckedIn",
          checkinTimestamp: ticketAtom.timestampConsumed.toISOString(),
          checker: PRETIX_CHECKER
        };
      }

      // Is there a pending check-in for the ticket?
      // If so, return as though this has succeeded.
      const pendingCheckin = this.pendingCheckIns.get(ticketAtom.id);
      if (pendingCheckin) {
        span?.setAttribute("precheck_error", "AlreadyCheckedIn");
        return {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(pendingCheckin.timestamp).toISOString(),
          checker: PRETIX_CHECKER
        };
      }

      return true;
    });
  }

  /**
   * Verifies that a manual ticket can be checked in. The only reason for this
   * to be disallowed is if the ticket has already been checked in, or if there
   * is a pending check-in.
   */
  private async canCheckInManualTicket(
    client: PoolClient,
    manualTicket: ManualTicket
  ): Promise<true | PodboxTicketActionError> {
    return traced(LOG_NAME, "canCheckInManualTicket", async (span) => {
      // Is the ticket already checked in?
      const checkIn = await this.checkinDB.getByTicketId(
        client,
        this.id,
        manualTicket.id
      );

      if (checkIn) {
        span?.setAttribute("precheck_error", "AlreadyCheckedIn");
        return {
          name: "AlreadyCheckedIn",
          checkinTimestamp: checkIn.timestamp.toISOString(),
          checker: PRETIX_CHECKER
        };
      }

      // Is there a pending check-in for the ticket?
      const pendingCheckin = this.pendingCheckIns.get(manualTicket.id);
      if (pendingCheckin) {
        span?.setAttribute("precheck_error", "AlreadyCheckedIn");
        return {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(pendingCheckin.timestamp).toISOString(),
          checker: PRETIX_CHECKER
        };
      }

      return true;
    });
  }

  /**
   * Carry out a set of checks to ensure that a ticket can be checked in. This
   * is done in response to an API request that occurs when the user scans a
   * ticket. It is used by the scanning application to determine whether to
   * show an option to check the ticket in. If check-in is permitted, some
   * ticket data is returned.
   */
  private async checkPretixTicketPCDCanBeCheckedIn(
    request: PodboxTicketActionPreCheckRequest
  ): Promise<ActionConfigResponseValue> {
    return traced<ActionConfigResponseValue>(
      LOG_NAME,
      "checkPretixTicketPCDCanBeCheckedIn",
      async (span): Promise<ActionConfigResponseValue> => {
        return namedSqlTransaction(
          this.context.dbPool,
          "checkPretixTicketPCDCanBeCheckedIn",
          async (client) => {
            tracePipeline(this.definition);

            let checkerEmails: string[];
            const { eventId, ticketId } = request;

            // This method can only be used to pre-check for check-ins.
            // There is no pre-check for any other kind of action at this time.
            if (request.action.checkin !== true) {
              throw new PCDHTTPError(400, "Not supported");
            }

            try {
              span?.setAttribute("ticket_id", ticketId);

              const { emails, semaphoreId } =
                await this.credentialSubservice.verifyAndExpectZupassEmail(
                  request.credential
                );

              span?.setAttribute(
                "checker_email",
                emails?.map((e) => e.email).join(",") ?? ""
              );
              span?.setAttribute("checked_semaphore_id", semaphoreId);

              checkerEmails = emails?.map((e) => e.email) ?? [];
              if (checkerEmails.length === 0) {
                throw new Error("missing emails in credential");
              }
            } catch (e) {
              logger(
                `${LOG_TAG} Failed to verify credential due to error: `,
                e
              );
              setError(e, span);
              span?.setAttribute("precheck_error", "InvalidSignature");
              return {
                success: true,
                checkinActionInfo: {
                  canCheckIn: false,
                  permissioned: false,
                  reason: { name: "InvalidSignature" }
                }
              };
            }

            const realTicket = await this.db.loadById(this.id, ticketId);
            const manualTicket = await this.getManualTicketById(
              client,
              ticketId
            );
            const checkinInProductId =
              realTicket?.productId ?? manualTicket?.productId;
            if (!checkinInProductId) {
              throw new Error(`ticket with id '${ticketId}' does not exist`);
            }

            try {
              // Verify that checker can check in tickets for the specified event
              const canCheckInResult = await this.canCheckInForEvent(
                client,
                eventId,
                checkinInProductId,
                checkerEmails
              );

              if (canCheckInResult !== true) {
                span?.setAttribute("precheck_error", canCheckInResult.name);
                return {
                  success: true,
                  checkinActionInfo: {
                    permissioned: false,
                    canCheckIn: false,
                    reason: canCheckInResult
                  }
                };
              }

              // First see if we have an atom which matches the ticket ID
              const ticketAtom = await this.db.loadById(this.id, ticketId);
              if (ticketAtom && ticketAtom.eventId === eventId) {
                const canCheckInTicketResult =
                  await this.canCheckInPretixTicket(ticketAtom);
                if (canCheckInTicketResult !== true) {
                  if (canCheckInTicketResult.name === "AlreadyCheckedIn") {
                    return {
                      success: true,
                      checkinActionInfo: {
                        permissioned: true,
                        canCheckIn: false,
                        reason: canCheckInTicketResult,
                        ticket: {
                          eventName: this.atomToEventName(ticketAtom),
                          ticketName: this.atomToTicketName(ticketAtom),
                          attendeeEmail: ticketAtom.email as string,
                          attendeeName: ticketAtom.name
                        }
                      }
                    };
                  }
                  return {
                    success: true,
                    checkinActionInfo: {
                      permissioned: false,
                      canCheckIn: false,
                      reason: canCheckInTicketResult
                    }
                  };
                } else {
                  return {
                    success: true,
                    checkinActionInfo: {
                      permissioned: true,
                      canCheckIn: true,
                      ticket: {
                        eventName: this.atomToEventName(ticketAtom),
                        ticketName: this.atomToTicketName(ticketAtom),
                        attendeeEmail: ticketAtom.email as string,
                        attendeeName: ticketAtom.name
                      }
                    }
                  };
                }
              } else {
                // No Pretix atom found, try looking for a manual ticket
                const manualTicket = await this.getManualTicketById(
                  client,
                  ticketId
                );
                if (manualTicket && manualTicket.eventId === eventId) {
                  // Manual ticket found
                  const canCheckInTicketResult =
                    await this.canCheckInManualTicket(client, manualTicket);
                  if (canCheckInTicketResult !== true) {
                    if (canCheckInTicketResult.name === "AlreadyCheckedIn") {
                      const eventConfig = this.getEventById(
                        manualTicket.eventId
                      );
                      const ticketType = this.getProductById(
                        eventConfig,
                        manualTicket.productId
                      );
                      return {
                        success: true,
                        checkinActionInfo: {
                          permissioned: true,
                          canCheckIn: false,
                          reason: canCheckInTicketResult,
                          ticket: {
                            eventName: eventConfig.name,
                            ticketName: ticketType.name,
                            attendeeEmail: manualTicket.attendeeEmail,
                            attendeeName: manualTicket.attendeeName
                          }
                        }
                      };
                    }
                    return {
                      success: true,
                      checkinActionInfo: {
                        permissioned: false,
                        canCheckIn: false,
                        reason: canCheckInTicketResult
                      }
                    };
                  } else {
                    const eventConfig = this.getEventById(manualTicket.eventId);
                    const ticketType = this.getProductById(
                      eventConfig,
                      manualTicket.productId
                    );
                    return {
                      success: true,
                      checkinActionInfo: {
                        permissioned: true,
                        canCheckIn: true,
                        ticket: {
                          eventName: eventConfig.name,
                          ticketName: ticketType.name,
                          attendeeEmail: manualTicket.attendeeEmail,
                          attendeeName: manualTicket.attendeeName
                        }
                      }
                    };
                  }
                }
              }
            } catch (e) {
              logger(
                `${LOG_TAG} Error when finding ticket ${ticketId} for checkin by ${JSON.stringify(
                  checkerEmails
                )} on pipeline ${this.id}`,
                e
              );
              setError(e);
              span?.setAttribute("checkin_error", "InvalidTicket");
              return {
                success: true,
                checkinActionInfo: {
                  permissioned: false,
                  canCheckIn: false,
                  reason: { name: "InvalidTicket" }
                }
              };
            }
            // Didn't find any matching ticket
            logger(
              `${LOG_TAG} Could not find ticket ${ticketId} for event ${eventId} for checkin requested by ${JSON.stringify(
                checkerEmails
              )} on pipeline ${this.id}`
            );
            span?.setAttribute("checkin_error", "InvalidTicket");
            return {
              success: true,
              checkinActionInfo: {
                permissioned: false,
                canCheckIn: false,
                reason: { name: "InvalidTicket" }
              }
            };
          }
        );
      }
    );
  }

  /**
   * Perform a check-in.
   * This repeats the checks performed by {@link checkPretixTicketPCDCanBeCheckedIn}
   * and, if successful, records that a pending check-in is underway and sends
   * a check-in API request to Pretix.
   */
  private async checkinPretixTicketPCDs(
    request: PodboxTicketActionRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return traced(LOG_NAME, "checkinPretixTicketPCDs", async (span) => {
      return namedSqlTransaction(
        this.context.dbPool,
        "checkinPretixTicketPCDs",
        async (client) => {
          tracePipeline(this.definition);

          logger(
            LOG_TAG,
            `got request to check in tickets with request ${JSON.stringify(
              request
            )}`
          );

          let checkerEmails: string[];
          const { ticketId, eventId } = request;

          try {
            span?.setAttribute("ticket_id", ticketId);
            const { emails, semaphoreId } =
              await this.credentialSubservice.verifyAndExpectZupassEmail(
                request.credential
              );

            span?.setAttribute(
              "checker_email",
              emails?.map((e) => e.email).join(",") ?? ""
            );
            span?.setAttribute("checked_semaphore_id", semaphoreId);
            checkerEmails = emails?.map((e) => e.email) ?? [];

            if (checkerEmails.length === 0) {
              throw new Error("missing emails in credential");
            }
          } catch (e) {
            logger(`${LOG_TAG} Failed to verify credential due to error: `, e);
            setError(e, span);
            span?.setAttribute("checkin_error", "InvalidSignature");
            return { success: false, error: { name: "InvalidSignature" } };
          }

          const realTicket = await this.db.loadById(this.id, ticketId);
          const manualTicket = await this.getManualTicketById(client, ticketId);
          const checkinInProductId =
            realTicket?.productId ?? manualTicket?.productId;
          if (!checkinInProductId) {
            throw new Error(`ticket with id '${ticketId}' does not exist`);
          }
          const canCheckInResult = await this.canCheckInForEvent(
            client,
            eventId,
            checkinInProductId,
            checkerEmails
          );

          if (canCheckInResult !== true) {
            return { success: false, error: canCheckInResult };
          }

          // First see if we have an atom which matches the ticket ID
          const ticketAtom = await this.db.loadById(this.id, ticketId);
          if (ticketAtom && ticketAtom.eventId === eventId) {
            return this.checkInPretixTicket(ticketAtom, checkerEmails[0]);
          } else {
            const manualTicket = await this.getManualTicketById(
              client,
              ticketId
            );
            if (manualTicket && manualTicket.eventId === eventId) {
              // Manual ticket found, check in with the DB
              return this.checkInManualTicket(manualTicket, checkerEmails[0]);
            } else {
              // Didn't find any matching ticket
              logger(
                `${LOG_TAG} Could not find ticket ${ticketId} for event ${eventId} for checkin requested by ${JSON.stringify(
                  checkerEmails
                )} on pipeline ${this.id}`
              );
              span?.setAttribute("checkin_error", "InvalidTicket");
              return { success: false, error: { name: "InvalidTicket" } };
            }
          }
        }
      );
    });
  }

  /**
   * Checks a manual ticket into the DB.
   */
  private async checkInManualTicket(
    manualTicket: ManualTicket,
    checkerEmail: string
  ): Promise<PodboxTicketActionResponseValue> {
    return traced<PodboxTicketActionResponseValue>(
      LOG_NAME,
      "checkInManualTicket",
      async (span): Promise<PodboxTicketActionResponseValue> => {
        return namedSqlTransaction(
          this.context.dbPool,
          "checkInManualTicket",
          async (client) => {
            const pendingCheckin = this.pendingCheckIns.get(manualTicket.id);
            if (pendingCheckin) {
              span?.setAttribute("checkin_error", "AlreadyCheckedIn");
              return {
                success: false,
                error: {
                  name: "AlreadyCheckedIn",
                  checkinTimestamp: new Date(
                    pendingCheckin.timestamp
                  ).toISOString(),
                  checker: PRETIX_CHECKER
                }
              };
            }

            try {
              await this.checkinDB.checkIn(
                client,
                this.id,
                manualTicket.id,
                new Date(),
                checkerEmail
              );
              this.pendingCheckIns.set(manualTicket.id, {
                status: CheckinStatus.Success,
                timestamp: Date.now()
              });
            } catch (e) {
              logger(
                `${LOG_TAG} Failed to check in ticket ${manualTicket.id} for event ${manualTicket.eventId} on behalf of checker ${checkerEmail} on pipeline ${this.id}`
              );
              setError(e, span);
              this.pendingCheckIns.delete(manualTicket.id);

              if (e instanceof DatabaseError) {
                // We may have received a DatabaseError due to an insertion conflict
                // Detect this conflict by looking for an existing check-in.
                const existingCheckin = await this.checkinDB.getByTicketId(
                  client,
                  this.id,
                  manualTicket.id
                );
                if (existingCheckin) {
                  span?.setAttribute("checkin_error", "AlreadyCheckedIn");
                  return {
                    success: false,
                    error: {
                      name: "AlreadyCheckedIn",
                      checkinTimestamp: existingCheckin.timestamp.toISOString(),
                      checker: PRETIX_CHECKER
                    }
                  };
                }
              }
              span?.setAttribute("checkin_error", "ServerError");
              return { success: false, error: { name: "ServerError" } };
            }
            return { success: true };
          }
        );
      }
    );
  }

  /**
   * Check in a ticket to the Pretix back-end.
   */
  private async checkInPretixTicket(
    ticketAtom: PretixAtom,
    checkerEmail: string
  ): Promise<PodboxTicketActionResponseValue> {
    return traced<PodboxTicketActionResponseValue>(
      LOG_NAME,
      "checkInPretixTicket",
      async (span): Promise<PodboxTicketActionResponseValue> => {
        if (ticketAtom.isConsumed && ticketAtom.timestampConsumed) {
          span?.setAttribute("checkin_error", "AlreadyCheckedIn");
          return {
            success: false,
            error: {
              name: "AlreadyCheckedIn",
              checkinTimestamp: ticketAtom.timestampConsumed.toISOString(),
              checker: PRETIX_CHECKER // Pretix does not store a "checker"
            }
          };
        }

        const pretixEventId = this.atomToPretixEventId(ticketAtom);
        const pendingCheckin = this.pendingCheckIns.get(ticketAtom.id);
        if (pendingCheckin) {
          span?.setAttribute("checkin_error", "AlreadyCheckedIn");
          return {
            success: false,
            error: {
              name: "AlreadyCheckedIn",
              checkinTimestamp: new Date(
                pendingCheckin.timestamp
              ).toISOString(),
              checker: PRETIX_CHECKER
            }
          };
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
            `${LOG_TAG} Failed to check in ticket ${ticketAtom.id} for event ${ticketAtom.eventId} on behalf of checker ${checkerEmail} on pipeline ${this.id}`
          );
          setError(e, span);
          span?.setAttribute("checkin_error", "ServerError");
          this.pendingCheckIns.delete(ticketAtom.id);
          return { success: false, error: { name: "ServerError" } };
        }
        return { success: true };
      }
    );
  }

  private atomToEventName(atom: PretixAtom): string {
    return this.getEventById(atom.eventId).name;
  }

  private atomToEventLocation(atom: PretixAtom): string | undefined {
    return this.getEventById(atom.eventId).imageOptions?.eventLocation;
  }

  private atomToEventStartDate(atom: PretixAtom): string | undefined {
    return this.getEventById(atom.eventId).imageOptions?.eventStartDate;
  }

  private atomToIsAddOn(atom: PretixAtom): boolean | undefined {
    return this.getProductById(this.getEventById(atom.eventId), atom.productId)
      .isAddOnItem;
  }

  private atomToTicketName(atom: PretixAtom): string {
    const event = this.getEventById(atom.eventId);
    const product = this.getProductById(event, atom.productId);
    return product.name;
  }

  private imageOptionsToImageUrl(
    imageOptions: ImageOptions | undefined,
    isCheckedIn: boolean
  ): string | undefined {
    if (!imageOptions) return undefined;
    if (imageOptions.requireCheckedIn && !isCheckedIn) return undefined;
    return imageOptions.imageUrl;
  }

  private atomToPretixEventId(ticketAtom: PretixAtom): string {
    return this.getEventById(ticketAtom.eventId).externalId;
  }

  private atomToQrCodeOverrideImageUrl(
    ticketAtom: PretixAtom
  ): string | undefined {
    return this.getEventById(ticketAtom.eventId).imageOptions
      ?.qrCodeOverrideImageUrl;
  }

  private atomToImageUrl(ticketAtom: PretixAtom): string | undefined {
    return this.imageOptionsToImageUrl(
      this.getEventById(ticketAtom.eventId).imageOptions,
      ticketAtom.isConsumed
    );
  }

  private getEventById(eventId: string): PretixEventConfig {
    const eventConfig = this.definition.options.events.find(
      (ev) => ev.genericIssuanceId === eventId
    );
    if (!eventConfig) {
      throw new Error(`Could not find event ${eventId} on pipeline ${this.id}`);
    }
    return eventConfig;
  }

  private getProductById(
    event: PretixEventConfig,
    productId: string
  ): PretixProductConfig {
    const productConfig = event.products.find(
      (product) => product.genericIssuanceId === productId
    );
    if (!productConfig) {
      throw new Error(
        `Could not find product ${productId} for event ${event.genericIssuanceId} on pipeline ${this.id}`
      );
    }
    return productConfig;
  }

  public async getAllTickets(): Promise<{
    atoms: PretixAtom[];
    manual: ManualTicket[];
  }> {
    return {
      atoms: await this.db.load(this.id),
      manual: this.definition.options.manualTickets ?? []
    };
  }

  public async getAllTicketsForEmail(email: string): Promise<{
    atoms: PretixAtom[];
    manual: ManualTicket[];
  }> {
    return {
      atoms: await this.db.loadByEmail(this.id, email.toLowerCase()),
      manual: (this.definition.options.manualTickets ?? []).filter(
        (mt) => mt.attendeeEmail.toLowerCase() === email.toLowerCase()
      )
    };
  }

  public static is(p: Pipeline | undefined): p is PretixPipeline {
    return p?.type === PipelineType.Pretix;
  }

  /**
   * Retrieves ZuAuth configuration for this pipeline's PCDs.
   */
  private async getZuAuthConfig(): Promise<PipelineZuAuthConfig[]> {
    const publicKey = await getEdDSAPublicKey(this.eddsaPrivateKey);
    const metadata = this.definition.options.events.flatMap((ev) =>
      ev.products.map(
        (product) =>
          ({
            pcdType: "eddsa-ticket-pcd",
            publicKey,
            eventId: ev.genericIssuanceId,
            eventName: ev.name,
            productId: product.genericIssuanceId,
            productName: product.name
          }) satisfies PipelineEdDSATicketZuAuthConfig
      )
    );
    return metadata;
  }

  /**
   * Returns all of the IDs associated with a Pretix pipeline definition.
   */
  public static uniqueIds(definition: PretixPipelineDefinition): string[] {
    const ids = [definition.id];

    for (const event of definition.options.events) {
      ids.push(event.genericIssuanceId);

      for (const product of event.products) {
        ids.push(product.genericIssuanceId);
      }
    }

    for (const semaphoreGroup of definition.options.semaphoreGroups ?? []) {
      ids.push(semaphoreGroup.groupId);
    }

    // todo: also load manual tickets from db here
    for (const manualTicket of definition.options.manualTickets ?? []) {
      ids.push(manualTicket.id);
    }

    return ids;
  }
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
  order_code: string;
  position_id: string;
  pretix_checkin_timestamp: Date | null;
  addon_to_position_id: string | null;
}

export interface PretixAtom extends PipelineAtom {
  name: string;
  eventId: string; // UUID
  productId: string; // UUID
  orderCode: string;
  secret: string;
  timestampConsumed: Date | null;
  isConsumed: boolean;
  parentAtomId: string | null;
}

export function isPretixAtom(atom: PipelineAtom): atom is PretixAtom {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (atom as any).orderCode !== undefined;
}
