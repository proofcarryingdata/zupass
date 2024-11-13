import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  EdDSATicketPCDTypeName,
  ITicketData,
  TicketCategory,
  linkToTicket
} from "@pcd/eddsa-ticket-pcd";
import { getHash } from "@pcd/passport-crypto";
import {
  ActionConfigResponseValue,
  BadgeConfig,
  CONTACT_EVENT_NAME,
  GenericIssuanceSendPipelineEmailResponseValue,
  LemonadePipelineDefinition,
  LemonadePipelineEventConfig,
  LemonadePipelineTicketTypeConfig,
  ManualTicket,
  PipelineCheckinSummary,
  PipelineEdDSATicketZuAuthConfig,
  PipelineEmailType,
  PipelineLoadSummary,
  PipelineLog,
  PipelineSemaphoreGroupInfo,
  PipelineSetManualCheckInStateResponseValue,
  PipelineType,
  PodboxTicketActionError,
  PodboxTicketActionPreCheckRequest,
  PodboxTicketActionRequest,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  TicketInfo,
  isPerDayBadge
} from "@pcd/passport-interface";
import { PCDAction, PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { str } from "@pcd/util";
import { randomUUID } from "crypto";
import stable_stringify from "fast-json-stable-stringify";
import _ from "lodash";
import PQueue from "p-queue";
import { DatabaseError } from "pg";
import { PoolClient } from "postgres-pool";
import urljoin from "url-join";
import { v5 as uuidv5 } from "uuid";
import { LemonadeOAuthCredentials } from "../../../apis/lemonade/auth";
import { ILemonadeAPI } from "../../../apis/lemonade/lemonadeAPI";
import { LemonadeTicketSchema } from "../../../apis/lemonade/types";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { IPipelineCheckinDB } from "../../../database/queries/pipelineCheckinDB";
import { IPipelineConsumerDB } from "../../../database/queries/pipelineConsumerDB";
import { IPipelineEmailDB } from "../../../database/queries/pipelineEmailDB";
import { IPipelineSemaphoreHistoryDB } from "../../../database/queries/pipelineSemaphoreHistoryDB";
import {
  IBadgeGiftingDB,
  IContactSharingDB
} from "../../../database/queries/ticketActionDBs";
import { sqlQueryWithPool } from "../../../database/sqlQuery";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { ApplicationContext } from "../../../types";
import { logger } from "../../../util/logger";
import { EmailService } from "../../emailService";
import { PersistentCacheService } from "../../persistentCacheService";
import { setError, traceFlattenedObject, traced } from "../../telemetryService";
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

const LOG_NAME = "LemonadePipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export const LEMONADE_CHECKER = "Lemonade";

/**
 * Class encapsulating the complete set of behaviors that a {@link Pipeline} which
 * loads data from Lemonade is capable of.
 */
export class LemonadePipeline implements BasePipeline {
  public type = PipelineType.Lemonade;
  public capabilities: BasePipelineCapability[];

  private stopped = false;
  /**
   * Used to sign {@link EdDSATicketPCD}
   */
  private eddsaPrivateKey: string;
  private definition: LemonadePipelineDefinition;

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
  private db: IPipelineAtomDB<LemonadeAtom>;
  private checkinDB: IPipelineCheckinDB;
  private contactDB: IContactSharingDB;
  private emailDB: IPipelineEmailDB;
  private badgeDB: IBadgeGiftingDB;
  private api: ILemonadeAPI;
  private cacheService: PersistentCacheService;
  private consumerDB: IPipelineConsumerDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private semaphoreGroupProvider: SemaphoreGroupProvider | undefined;
  private semaphoreUpdateQueue: PQueue;
  private credentialSubservice: CredentialSubservice;
  private emailService: EmailService;
  private context: ApplicationContext;
  private sendingEmail: boolean;

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
    cacheService: PersistentCacheService,
    checkinDB: IPipelineCheckinDB,
    contactDB: IContactSharingDB,
    emailDB: IPipelineEmailDB,
    badgeDB: IBadgeGiftingDB,
    consumerDB: IPipelineConsumerDB,
    semaphoreHistoryDB: IPipelineSemaphoreHistoryDB,
    credentialSubservice: CredentialSubservice,
    emailService: EmailService,
    context: ApplicationContext
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<LemonadeAtom>;
    this.contactDB = contactDB;
    this.emailDB = emailDB;
    this.badgeDB = badgeDB;
    this.api = api;
    this.credentialSubservice = credentialSubservice;
    this.context = context;
    this.emailService = emailService;
    this.sendingEmail = false;

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
        issue: this.issueLemonadeTicketPCDs.bind(this),
        options: this.definition.options.feedOptions,
        type: PipelineCapability.FeedIssuance,
        feedUrl: makeGenericIssuanceFeedUrl(
          this.id,
          this.definition.options.feedOptions.feedId
        ),
        getZuAuthConfig: this.getZuAuthConfig.bind(this)
      } satisfies FeedIssuanceCapability,
      {
        checkin: this.executeTicketAction.bind(this),
        type: PipelineCapability.Checkin,
        getCheckinUrl: (): string => generateCheckinUrlPath(),
        canHandleCheckinForEvent: (eventId: string): boolean => {
          return this.definition.options.events.some(
            (ev) => ev.genericIssuanceEventId === eventId
          );
        },
        preCheck: this.precheckTicketAction.bind(this),
        getManualCheckinSummary: this.getManualCheckinSummary.bind(this),
        userCanCheckIn: this.userCanCheckIn.bind(this),
        setManualCheckInState: this.setManualCheckInState.bind(this)
      } satisfies CheckinCapability,
      {
        type: PipelineCapability.SemaphoreGroup,
        getSerializedLatestGroup: async (
          groupId: string
        ): Promise<SerializedSemaphoreGroup | undefined> => {
          return sqlQueryWithPool(
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
          return sqlQueryWithPool(
            this.context.dbPool,
            async (client) =>
              this.semaphoreGroupProvider?.getLatestGroupRoot(client, groupId)
          );
        },
        getSerializedHistoricalGroup: async (
          groupId: string,
          rootHash: string
        ): Promise<SerializedSemaphoreGroup | undefined> => {
          return sqlQueryWithPool(
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
    this.consumerDB = consumerDB;
    this.semaphoreHistoryDB = semaphoreHistoryDB;
    this.semaphoreUpdateQueue = new PQueue({ concurrency: 1 });
  }

  public isStopped(): boolean {
    return this.stopped;
  }

  public async start(): Promise<void> {
    if (this.stopped) {
      throw new Error(`pipeline ${this.id} already stopped`);
    }
    logger(LOG_TAG, `starting lemonade pipeline with id ${this.id}`);
    await this.semaphoreGroupProvider?.start();
  }

  public async stop(): Promise<void> {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    logger(LOG_TAG, `stopping LemonadePipeline with id ${this.id}`);
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
  public async load(): Promise<PipelineLoadSummary> {
    return traced(LOG_NAME, "load", async (span) => {
      tracePipeline(this.definition);

      const logs: PipelineLog[] = [];
      const loadStart = new Date();
      const configuredEvents = this.definition.options.events;
      let atomsExpected = 0;
      const credentials = this.getOAuthCredentials();

      // For each event, fetch tickets
      const eventTickets = await Promise.all(
        configuredEvents.map(
          async (eventConfig: LemonadePipelineEventConfig) => {
            const liveTicketTypes = await this.api.getEventTicketTypes(
              this.definition.options.backendUrl,
              credentials,
              eventConfig.externalId
            );

            logs.push(
              makePLogInfo(
                `ticket types for event loaded from lemonade for event ${
                  eventConfig.name
                } ('${eventConfig.externalId}') are: ${str(
                  liveTicketTypes.ticket_types.map((t) => {
                    return `${t._id} (${t.title})`;
                  })
                )}`
              )
            );

            let ticketsFromLemonade: unknown[];
            try {
              ticketsFromLemonade = await this.api.getTickets(
                this.definition.options.backendUrl,
                credentials,
                eventConfig.externalId
              );
            } catch (e) {
              const message =
                e instanceof Error ? e.message : `Received error: ${e}`;
              logs.push(makePLogErr(message));
              return { eventConfig, tickets: [] };
            }

            logs.push(
              makePLogInfo(
                `loaded ${ticketsFromLemonade.length} tickets for ${eventConfig.name} ('${eventConfig.externalId}').`
              )
            );
            logs.push(makePLogInfo(str(ticketsFromLemonade)));

            // We only want to return tickets which are of a supported type
            // Get the supported types from event configuration
            const configuredTicketTypeExternalIds = new Set(
              eventConfig.ticketTypes.map((ticketType) => ticketType.externalId)
            );

            logs.push(
              makePLogInfo(
                `configured ticket types for event '${
                  eventConfig.externalId
                }' are ${str(
                  eventConfig.ticketTypes.map((t) => {
                    return `${t.name} (${t.externalId})`;
                  })
                )}`
              )
            );

            const validTickets = [];
            atomsExpected += ticketsFromLemonade.length;
            for (const maybeTicket of ticketsFromLemonade) {
              // By parsing tickets individually, we allow valid tickets to
              // proceed even if some tickets must be skipped.
              // Because a pipeline load completely replaces the previously
              // loaded data, this may mean that changes in ticket state in
              // Lemonade can cause tickets to disappear, if the new state is one
              // that we cannot parse.
              const parseResult = LemonadeTicketSchema.safeParse(maybeTicket);
              if (parseResult.success) {
                logs.push(makePLogInfo(`parsed ticket ${str(parseResult)}`));

                const ticket = parseResult.data;

                // Filter the tickets down to configured ticket types
                if (configuredTicketTypeExternalIds.has(ticket.type_id)) {
                  validTickets.push(ticket);
                } else {
                  const message = `Unsupported ticket type ${
                    ticket.type_title
                  } ('${ticket.type_id}') on ticket ${str(ticket)}, pipeline '${
                    this.id
                  }'`;
                  logs.push(makePLogWarn(message));
                  logger(`${LOG_TAG} ${message}`);
                }
              } else {
                const message = `Could not parse ticket '${str(
                  maybeTicket
                )}' for event ${eventConfig.name} ('${
                  eventConfig.externalId
                }'), pipeline '${this.id}' because ${str(parseResult.error)}`;
                logs.push(makePLogErr(message));
                logger(`${LOG_TAG} ${message}`);
              }
            }

            logs.push(
              makePLogInfo(`loaded ${validTickets.length} valid tickets`)
            );

            return {
              eventConfig,
              tickets: validTickets
            };
          }
        )
      );

      const atomsToSave = eventTickets.flatMap(
        ({ eventConfig, tickets }): LemonadeAtom[] => {
          return tickets.map(
            (t) =>
              ({
                id: uuidv5(t._id, eventConfig.genericIssuanceEventId),
                email: t.email.toLowerCase(),
                name:
                  t.user_first_name.length > 0 || t.user_last_name.length > 0
                    ? `${t.user_first_name} ${t.user_last_name}`.trim()
                    : t.user_name,
                lemonadeEventId: eventConfig.externalId,
                lemonadeTicketTypeId: t.type_id,
                genericIssuanceEventId: eventConfig.genericIssuanceEventId,
                // The 'as string' cast here is safe because we know that the
                // ticket type exists, having earlier filtered out tickets for
                // which the ticket type does not exist.
                genericIssuanceProductId: eventConfig.ticketTypes.find(
                  (ticketType) => ticketType.externalId === t.type_id
                )?.genericIssuanceProductId as string,
                lemonadeUserId: t.user_id,
                checkinDate: t.checkin_date,
                lemonadeTicketId: t._id
              }) satisfies LemonadeAtom
          );
        }
      );

      logger(
        LOG_TAG,
        `saving ${atomsToSave.length} atoms for pipeline id ${this.id}`
      );

      // TODO: error handling
      await this.db.clear(this.definition.id);
      await this.db.save(this.definition.id, atomsToSave);
      await this.db.markAsLoaded(this.id);

      const loadEnd = Date.now();

      logger(
        LOG_TAG,
        `loaded ${atomsToSave.length} atoms for pipeline id ${this.id} in ${
          loadEnd - loadStart.getTime()
        }ms`
      );

      span?.setAttribute("atoms_saved", atomsToSave.length);
      span?.setAttribute("load_duration_ms", loadEnd - loadStart.getTime());

      // Remove any pending check-ins that succeeded before loading started.
      // Those that succeeded after loading started might not be represented in
      // the data we fetched, so we can remove them on the next run.
      // Pending checkins with the "Pending" status should not be removed, as
      // they are still in-progress.
      this.pendingCheckIns.forEach((value, key) => {
        if (
          value.status === CheckinStatus.Success &&
          value.timestamp <= loadStart.getTime()
        ) {
          this.pendingCheckIns.delete(key);
        }
      });

      const end = new Date();
      logs.push(
        makePLogInfo(
          `load finished in ${end.getTime() - loadStart.getTime()}ms`
        )
      );

      if ((this.definition.options.semaphoreGroups ?? []).length > 0) {
        await sqlQueryWithPool(this.context.dbPool, (client) =>
          this.triggerSemaphoreGroupUpdate(client)
        );
      }

      return {
        fromCache: false,
        paused: false,
        latestLogs: logs,
        lastRunEndTimestamp: end.toISOString(),
        lastRunStartTimestamp: loadStart.toISOString(),
        atomsLoaded: atomsToSave.length,
        atomsExpected: atomsExpected,
        errorMessage: undefined,
        semaphoreGroups: this.semaphoreGroupProvider?.getSupportedGroups(),
        success: true
      } satisfies PipelineLoadSummary;
    });
  }

  /**
   * Collects data that is require for Semaphore groups to update.
   * Returns an array of { eventId, productId, email } objects, which the
   * SemaphoreGroupProvider will use to look up Semaphore IDs and match them
   * to configured Semaphore groups.
   */
  private async semaphoreGroupData(): Promise<SemaphoreGroupTicketInfo[]> {
    return traced(LOG_NAME, "semaphoreGroupData", async (span) => {
      const data = [];
      for (const atom of await this.db.load(this.id)) {
        data.push({
          email: atom.email,
          eventId: atom.genericIssuanceEventId,
          productId: atom.genericIssuanceProductId
        });
      }

      for (const manualTicket of this.definition.options.manualTickets ?? []) {
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

  /**
   * Tell the Semaphore group provider to update memberships.
   * Marked as public so that it can be called from tests, but otherwise should
   * not be called from outside the class.
   */
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
        const data = await this.semaphoreGroupData();
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
        (this.definition.options.manualTickets ?? []).map(
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

          this.checkinDB.deleteCheckIn(client, this.id, checkIn.ticketId);
        }
      }
    });
  }

  private async manualTicketToTicketData(
    client: PoolClient,
    manualTicket: ManualTicket,
    sempahoreId: string
  ): Promise<ITicketData> {
    const event = this.getEventById(manualTicket.eventId);
    const product = this.getTicketTypeById(event, manualTicket.productId);

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

  private getManualTicketsForEmail(email: string): ManualTicket[] {
    return (this.definition.options.manualTickets ?? []).filter(
      (manualTicket) => {
        return manualTicket.attendeeEmail.toLowerCase() === email;
      }
    );
  }

  private getManualTicketById(id: string): ManualTicket | undefined {
    return (this.definition.options.manualTickets ?? []).find(
      (manualTicket) => manualTicket.id === id
    );
  }

  private async getReceivedBadgesForEmail(
    client: PoolClient,
    email: string
  ): Promise<SerializedPCD<EdDSATicketPCD>[]> {
    const badges = await this.badgeDB.getBadges(client, this.id, email);

    const badgePCDs = await Promise.all(
      badges.map(async (b, i) => {
        const badgeConfig =
          this.definition.options.ticketActions?.badges?.choices?.find(
            (c) => c.id === b.id
          );

        if (!badgeConfig) {
          return undefined;
        }

        // semaphore id intentially left blank, as I'm just trying to get the ticket
        // so that I can link to it, not issue it/make proofs about it
        const tickets = await this.getTicketsForEmail(client, b.giver, "");
        const ticket = tickets?.[0]?.claim?.ticket;
        const encodedLink = linkToTicket(
          urljoin(process.env.PASSPORT_CLIENT_URL ?? "", "/#/generic-checkin"),
          ticket?.ticketId,
          ticket?.eventId
        );

        const productId = uuidv5(
          `badge-${badgeConfig.id}-${badgeConfig.eventName}-${badgeConfig.productName}`,
          this.id
        );
        // This means that all badges given out at the same event have a common
        // event ID, which is derived from the event's ID
        const eventId = uuidv5(`badge-${ticket.eventId}`, this.id);
        const ticketId = uuidv5(`ticket-${productId}-${email}-${i}`, this.id);

        return await EdDSATicketPCDPackage.serialize(
          await EdDSATicketPCDPackage.prove({
            id: {
              argumentType: ArgumentTypeName.String,
              value: ticketId
            },
            privateKey: {
              argumentType: ArgumentTypeName.String,
              value: this.eddsaPrivateKey
            },
            ticket: {
              argumentType: ArgumentTypeName.Object,
              value: {
                // The fields below are not signed and are used for display purposes.
                eventName: badgeConfig.eventName,
                ticketName: badgeConfig.productName ?? "",
                checkerEmail: undefined,
                imageUrl: badgeConfig.imageUrl,
                // link to giver ticket encoded in alt text
                imageAltText: encodedLink,
                // The fields below are signed using the passport-server's private EdDSA key
                // and can be used by 3rd parties to represent their own tickets.
                eventId, // The event ID uniquely identifies an event.
                productId, // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
                ticketId, // The ticket ID is a unique identifier of the ticket.
                timestampConsumed: 0,
                timestampSigned: Date.now(),
                attendeeSemaphoreId: ticket.attendeeSemaphoreId,
                isConsumed: false,
                isRevoked: false,
                ticketCategory: TicketCategory.Generic,
                attendeeName: "",
                // giver email in attendee email
                attendeeEmail: b.giver ?? ""
              }
            }
          })
        );
      })
    );

    return badgePCDs.filter((pcd) => !!pcd) as SerializedPCD<EdDSATicketPCD>[];
  }

  private async getReceivedContactsForEmail(
    client: PoolClient,
    email: string
  ): Promise<SerializedPCD<EdDSATicketPCD>[]> {
    const contacts = await this.contactDB.getContacts(client, this.id, email);
    return Promise.all(
      contacts.map(async (contact) => {
        // semaphore id intentially left blank, as I'm just trying to get the ticket
        // so that I can link to it, not issue it/make proofs about it
        const tickets = await this.getTicketsForEmail(client, contact, "");
        const ticket: ITicketData | undefined = tickets?.[0]?.claim?.ticket;
        const encodedLink = linkToTicket(
          urljoin(process.env.PASSPORT_CLIENT_URL ?? "", "/#/generic-checkin"),
          ticket?.ticketId,
          ticket?.eventId
        );

        return await EdDSATicketPCDPackage.serialize(
          await EdDSATicketPCDPackage.prove({
            id: {
              argumentType: ArgumentTypeName.String,
              value: `${this.id}:${contact}->${email}`
            },
            privateKey: {
              argumentType: ArgumentTypeName.String,
              value: this.eddsaPrivateKey
            },
            ticket: {
              argumentType: ArgumentTypeName.Object,
              value: {
                // The fields below are not signed and are used for display purposes.
                eventName: CONTACT_EVENT_NAME,
                ticketName: contact,
                checkerEmail: undefined,
                imageUrl: "https://i.ibb.co/WcPcL0g/stick.webp",
                // we hack a link to the ticket into the alt text field
                // XD
                imageAltText: encodedLink,
                // The fields below are signed using the passport-server's private EdDSA key
                // and can be used by 3rd parties to represent their own tickets.
                ticketId: randomUUID(), // The ticket ID is a unique identifier of the ticket.
                eventId: uuidv5("", this.id), // The event ID uniquely identifies an event.
                productId: uuidv5(contact, this.id), // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
                timestampConsumed: 0,
                timestampSigned: Date.now(),
                attendeeSemaphoreId: "",
                isConsumed: false,
                isRevoked: false,
                ticketCategory: TicketCategory.Generic,
                attendeeName: ticket?.attendeeName ?? "",
                attendeeEmail: contact ?? ""
              }
            }
          })
        );
      })
    );
  }

  /**
   * Retrieves all tickets for a single email address, including both tickets
   * from the Lemonade backend and manually-specified tickets from the Pipeline
   * definition.
   */
  private async getTicketsForEmail(
    client: PoolClient,
    email: string,
    identityCommitment: string
  ): Promise<EdDSATicketPCD[]> {
    return traced(LOG_NAME, "getTicketsForEmail", async () => {
      // Load atom-backed tickets

      const relevantTickets = await this.db.loadByEmail(this.id, email);

      // Load check-in data
      const checkIns = await traced(LOG_NAME, "get checkins", async () =>
        this.checkinDB.getByTicketIds(
          client,
          this.id,
          relevantTickets.map((ticket) => ticket.id)
        )
      );
      const checkInsById = _.keyBy(checkIns, (checkIn) => checkIn.ticketId);

      // Convert atoms to ticket data
      const ticketDatas = relevantTickets.map((t) => {
        if (checkInsById[t.id]) {
          t.checkinDate = checkInsById[t.id].timestamp;
        }
        return this.atomToTicketData(t, identityCommitment);
      });
      // Load manual tickets from the definition
      const manualTickets = this.getManualTicketsForEmail(email);
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
    });
  }

  private async issueLemonadeTicketPCDs(
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return traced(LOG_NAME, "issueLemonadeTicketPCDs", async (span) => {
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

      const credential =
        await this.credentialSubservice.verifyAndExpectZupassEmail(req.pcd);

      const { emails, semaphoreId } = credential;

      if (!emails || emails.length === 0) {
        throw new Error("missing emails in credential");
      }

      span?.setAttribute("emails", emails.map((e) => e.email).join(","));
      span?.setAttribute("semaphore_id", semaphoreId);

      // let didUpdate = false;
      // for (const email of emails) {
      //   // Consumer is validated, so save them in the consumer list
      //   didUpdate =
      //     didUpdate ||
      //     (await this.consumerDB.save(
      //       client,
      //       this.id,
      //       email.email,
      //       semaphoreId,
      //       new Date()
      //     ));
      // }

      // if ((this.definition.options.semaphoreGroups ?? []).length > 0) {
      //   // If the user's Semaphore commitment has changed, `didUpdate` will be
      //   // true, and we need to update the Semaphore groups
      //   if (didUpdate) {
      //     span?.setAttribute("semaphore_groups_updated", true);
      //     await this.triggerSemaphoreGroupUpdate(client);
      //   }
      // }

      const tickets = await sqlQueryWithPool(
        this.context.dbPool,
        async (client) => {
          return (
            await Promise.all(
              emails.map((e) =>
                this.getTicketsForEmail(client, e.email, semaphoreId)
              )
            )
          ).flat();
        }
      );

      const ticketActions: PCDAction[] = [];

      if (await this.db.hasLoaded(this.id)) {
        ticketActions.push({
          type: PCDActionType.DeleteFolder,
          folder: this.definition.options.feedOptions.feedFolder,
          recursive: true
        });
      }

      const ticketPCDs = await traced(LOG_NAME, "serialize tickets", async () =>
        Promise.all(tickets.map((t) => EdDSATicketPCDPackage.serialize(t)))
      );

      ticketActions.push({
        type: PCDActionType.ReplaceInFolder,
        folder: this.definition.options.feedOptions.feedFolder,
        pcds: ticketPCDs
      });

      traceFlattenedObject(span, {
        pcds_issued: tickets.length,
        tickets_issued: tickets.length
      });

      return {
        actions: [...ticketActions]
      };
    });
  }

  private async getOrGenerateTicket(
    ticketData: ITicketData
  ): Promise<EdDSATicketPCD> {
    return traced(LOG_NAME, "getOrGenerateTicket", async (span) => {
      span?.setAttribute("ticket_id", ticketData.ticketId);
      span?.setAttribute("ticket_email", ticketData.attendeeEmail);
      span?.setAttribute("ticket_name", ticketData.attendeeName);

      const cachedTicket = await this.getCachedTicket(ticketData);

      if (cachedTicket) {
        span?.setAttribute("from_cache", true);
        return cachedTicket;
      }

      logger(
        `${LOG_TAG} cache miss for ticket id ${ticketData.ticketId} on pipeline ${this.id}`
      );

      const generatedTicket = await this.ticketDataToTicketPCD(
        ticketData,
        this.eddsaPrivateKey
      );

      try {
        this.cacheTicket(generatedTicket);
      } catch (e) {
        logger(
          `${LOG_TAG} error caching ticket ${ticketData.ticketId} ` +
            `${ticketData.attendeeEmail} for ${ticketData.eventId} (${ticketData.eventName}) on pipeline ${this.id}`
        );
      }

      return generatedTicket;
    });
  }

  private static async getTicketCacheKey(
    ticketData: ITicketData,
    eddsaPrivateKey: string,
    pipelineId: string
  ): Promise<string> {
    const ticketCopy: Partial<ITicketData> = { ...ticketData };
    // the reason we remove `timestampSigned` from the cache key
    // is that it changes every time we instantiate `ITicketData`
    // for a particular devconnect ticket, rendering the caching
    // ineffective.
    delete ticketCopy.timestampSigned;
    const hash = await getHash(
      stable_stringify(ticketCopy) +
        eddsaPrivateKey +
        pipelineId +
        EdDSATicketPCDTypeName
    );
    return hash;
  }

  private async cacheTicket(ticket: EdDSATicketPCD): Promise<void> {
    const key = await LemonadePipeline.getTicketCacheKey(
      ticket.claim.ticket,
      this.eddsaPrivateKey,
      this.id
    );
    const serialized = await EdDSATicketPCDPackage.serialize(ticket);
    this.cacheService.setValue(key, JSON.stringify(serialized));
  }

  private async getCachedTicket(
    ticketData: ITicketData
  ): Promise<EdDSATicketPCD | undefined> {
    const key = await LemonadePipeline.getTicketCacheKey(
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

  private async ticketDataToTicketPCD(
    ticketData: ITicketData,
    eddsaPrivateKey: string
  ): Promise<EdDSATicketPCD> {
    const stableId = await getHash(
      `issued-ticket-${this.id}-${ticketData.ticketId}`
    );

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

    const correspondingTicketTypeConfig =
      correspondingEventConfig.ticketTypes.find(
        (t) => t.externalId === atom.lemonadeTicketTypeId
      );

    if (!correspondingTicketTypeConfig) {
      throw new Error("no corresponding ticket type config");
    }

    return correspondingTicketTypeConfig.genericIssuanceProductId;
  }

  private getEventByLemonadeId(
    lemonadeId: string
  ): LemonadePipelineEventConfig | undefined {
    return this.definition.options.events.find(
      (e) => e.externalId === lemonadeId
    );
  }

  private lemonadeAtomToEvent(atom: LemonadeAtom): LemonadePipelineEventConfig {
    const event = this.getEventByLemonadeId(atom.lemonadeEventId);

    if (!event) {
      throw new Error(
        `no lemonade event with id ${atom.lemonadeEventId} in pipeline ${this.id}`
      );
    }

    return event;
  }

  private lemonadeAtomToEventName(atom: LemonadeAtom): string {
    return this.lemonadeAtomToEvent(atom).name;
  }

  /**
   * It's important to keep this up to date with whatever is in Lemonade.
   * Thus, the {@link LemonadePipeline#load} function should probably have
   * the ability to update its {@link PipelineDefinition}, as that is where
   * the 'name' of ticket type (which corresponds to the ticket name) is stored.
   */
  private lemonadeAtomToTicketName(atom: LemonadeAtom): string {
    const event = this.definition.options.events.find(
      (event) => event.externalId === atom.lemonadeEventId
    );

    if (!event) {
      throw new Error(
        `no lemonade event with id ${atom.lemonadeEventId} in pipeline ${this.id}`
      );
    }

    const ticketType = event.ticketTypes.find(
      (ticketType) => ticketType.externalId === atom.lemonadeTicketTypeId
    );

    if (!ticketType) {
      throw new Error(
        `no pretix product with id ${atom.lemonadeTicketTypeId} in pipeline ${this.id}`
      );
    }

    return ticketType.name;
  }

  /**
   * Matches real Lemonade API, though might need some refactors due to
   * mismatches in data models.
   */
  private atomToTicketData(
    atom: LemonadeAtom,
    semaphoreId: string
  ): ITicketData {
    return {
      // unsigned fields
      attendeeName: atom.name,
      attendeeEmail: atom.email.toLowerCase(),
      eventName: this.lemonadeAtomToEventName(atom),
      ticketName: this.lemonadeAtomToTicketName(atom),
      checkerEmail: undefined, // Doesn't exist in Lemonade

      // signed fields
      ticketId: atom.id,
      eventId: atom.genericIssuanceEventId,
      productId: atom.genericIssuanceProductId,
      timestampConsumed:
        atom.checkinDate instanceof Date ? atom.checkinDate.getTime() : 0,
      timestampSigned: Date.now(),
      attendeeSemaphoreId: semaphoreId,
      isConsumed: atom.checkinDate instanceof Date,
      isRevoked: false, // Not clear what concept this maps to in Lemonade
      ticketCategory: TicketCategory.Generic // TODO?
    } satisfies ITicketData;
  }

  /**
   * Returns true if a user can check tickets in for any event on this pipeline.
   */
  private async userCanCheckIn(email: string): Promise<boolean> {
    for (const event of this.definition.options.events) {
      if (
        await this.canCheckInForEvent(event.genericIssuanceEventId, [email])
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Given an event and a checker email, verifies that the checker has permission to perform
   * check-ins for the event.
   */
  private async canCheckInForEvent(
    eventId: string,
    checkerEmails: string[]
  ): Promise<true | PodboxTicketActionError> {
    const eventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceEventId === eventId
    );

    if (!eventConfig) {
      return { name: "InvalidTicket" };
    }

    // Collect all of the product IDs that the checker owns for this event
    const checkerProductIds: string[] = [];
    const checkerTickets = (
      await Promise.all(
        checkerEmails.map((e) => this.db.loadByEmail(this.id, e))
      )
    ).flat();
    for (const checkerTicketAtom of checkerTickets) {
      if (checkerTicketAtom.genericIssuanceEventId === eventId) {
        checkerProductIds.push(checkerTicketAtom.genericIssuanceProductId);
      }
    }
    const manualTickets = (
      await Promise.all(
        checkerEmails.map((e) => this.getManualTicketsForEmail(e))
      )
    ).flat();
    for (const manualTicket of manualTickets) {
      if (manualTicket.eventId === eventConfig.genericIssuanceEventId) {
        checkerProductIds.push(manualTicket.productId);
      }
    }

    const checkerEmailIsSuperuser =
      this.definition.options.superuserEmails?.find((e) =>
        checkerEmails.includes(e)
      ) ?? false;
    const hasSuperUserTicket = checkerProductIds.some((productId) => {
      return eventConfig.ticketTypes.find(
        (ticketType) =>
          ticketType.isSuperUser &&
          ticketType.genericIssuanceProductId === productId
      );
    });

    if (!hasSuperUserTicket && !checkerEmailIsSuperuser) {
      return { name: "NotSuperuser" };
    }

    return true;
  }

  /**
   * Verifies that a Lemonade ticket can be checked in. The only reason for
   * this to be disallowed is if the ticket is already checked in, or if there
   * is a pending check-in.
   */
  private async notCheckedIn(
    ticketAtom: LemonadeAtom
  ): Promise<true | PodboxTicketActionError> {
    return traced(LOG_NAME, "canCheckInLemonadeTicket", async (span) => {
      // Is the ticket already checked in?
      // Only check if ticket is already checked in here, to avoid leaking
      // information about ticket check-in status to unpermitted users.
      if (ticketAtom.checkinDate instanceof Date) {
        span?.setAttribute("precheck_error", "AlreadyCheckedIn");
        return {
          name: "AlreadyCheckedIn",
          checkinTimestamp: ticketAtom.checkinDate.toISOString(),
          checker: LEMONADE_CHECKER
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
          checker: LEMONADE_CHECKER
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
  private async notCheckedInManual(
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
          checker: LEMONADE_CHECKER
        };
      }

      // Is there a pending check-in for the ticket?
      const pendingCheckin = this.pendingCheckIns.get(manualTicket.id);
      if (pendingCheckin) {
        span?.setAttribute("precheck_error", "AlreadyCheckedIn");
        return {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(pendingCheckin.timestamp).toISOString(),
          checker: LEMONADE_CHECKER
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
  private async precheckTicketAction(
    request: PodboxTicketActionPreCheckRequest
  ): Promise<ActionConfigResponseValue> {
    return traced<ActionConfigResponseValue>(
      LOG_NAME,
      "precheckTicketAction",
      async (span): Promise<ActionConfigResponseValue> => {
        return sqlQueryWithPool(this.context.dbPool, async (client) => {
          tracePipeline(this.definition);

          let actorEmails: string[];

          // This method can only be used to pre-check for check-ins.
          // There is no pre-check for any other kind of action at this time.
          if (request.action.checkin !== true) {
            throw new PCDHTTPError(400, "Not supported");
          }

          const result: ActionConfigResponseValue = {
            success: true,
            giveBadgeActionInfo: undefined,
            checkinActionInfo: undefined,
            getContactActionInfo: undefined
          };

          // 1) verify that the requester is who they say they are
          try {
            span?.setAttribute("ticket_id", request.ticketId);
            const credential =
              await this.credentialSubservice.verifyAndExpectZupassEmail(
                request.credential
              );

            const { emails, semaphoreId } = credential;
            if (!emails || emails.length === 0) {
              throw new Error("missing emails in credential");
            }

            span?.setAttribute(
              "checker_emails",
              emails.map((e) => e.email)
            );
            span?.setAttribute("checked_semaphore_id", semaphoreId);

            actorEmails = emails.map((e) => e.email);
          } catch (e) {
            logger(`${LOG_TAG} Failed to verify credential due to error: `, e);
            setError(e, span);
            span?.setAttribute("precheck_error", "InvalidSignature");
            return {
              success: false,
              error: { name: "InvalidSignature" }
            };
          }

          let eventConfig: LemonadePipelineEventConfig;
          const manualTicket = this.getManualTicketById(request.ticketId);
          const ticketAtom = await this.db.loadById(this.id, request.ticketId);
          let ticketInfo: TicketInfo;
          let notCheckedIn;

          if (ticketAtom) {
            eventConfig = this.lemonadeAtomToEvent(ticketAtom);
            ticketInfo = {
              eventName: eventConfig.name,
              ticketName: this.lemonadeAtomToTicketName(ticketAtom),
              attendeeEmail: ticketAtom.email,
              attendeeName: ticketAtom.name
            };
            notCheckedIn = await this.notCheckedIn(ticketAtom);
          } else if (manualTicket) {
            eventConfig = this.getEventById(manualTicket.eventId);
            const ticketType = this.getTicketTypeById(
              eventConfig,
              manualTicket.productId
            );
            ticketInfo = {
              eventName: eventConfig.name,
              ticketName: ticketType.name,
              attendeeEmail: manualTicket.attendeeEmail,
              attendeeName: manualTicket.attendeeName
            };
            notCheckedIn = await this.notCheckedInManual(client, manualTicket);
          } else {
            return {
              success: false,
              error: { name: "InvalidTicket" }
            };
          }

          // 1) checkin action
          const canCheckIn = await this.canCheckInForEvent(
            request.eventId,
            actorEmails
          );
          if (canCheckIn !== true) {
            result.checkinActionInfo = {
              permissioned: false,
              canCheckIn: false,
              reason: { name: "NotSuperuser" }
            };
          } else if (notCheckedIn !== true) {
            result.checkinActionInfo = {
              permissioned: true,
              canCheckIn: false,
              reason: notCheckedIn,
              ticket: ticketInfo
            };
          } else {
            result.checkinActionInfo = {
              permissioned: true,
              canCheckIn: true,
              ticket: ticketInfo
            };
          }

          // 2) badge action
          if (this.definition.options.ticketActions?.badges?.enabled) {
            const badgesGivenToTicketHolder = await this.badgeDB.getBadges(
              client,
              this.id,
              ticketInfo.attendeeEmail
            );

            const badgesGiveableByUser = (
              await Promise.all(
                actorEmails.map((e) => this.getBadgesGiveableByEmail(e))
              )
            ).flat();

            const rateLimitedGiveableByUser = badgesGiveableByUser.filter(
              (b) => b.maxPerDay !== undefined
            );

            const notAlreadyGivenBadges = badgesGiveableByUser.filter(
              (c) => !badgesGivenToTicketHolder.find((b) => b.id === c.id)
            );

            const intervalMs = 24 * 60 * 60 * 1000;
            const alreadyGivenRateLimited = (
              await Promise.all(
                actorEmails.map((e) =>
                  this.badgeDB.getGivenBadges(
                    client,
                    this.id,
                    e,
                    rateLimitedGiveableByUser.map((b) => b.id),
                    intervalMs
                  )
                )
              )
            ).flat();

            result.giveBadgeActionInfo = {
              permissioned: badgesGiveableByUser.length > 0,
              giveableBadges: notAlreadyGivenBadges,
              rateLimitedBadges: badgesGiveableByUser
                .filter(isPerDayBadge)
                .filter(() => {
                  return !actorEmails.includes(ticketInfo.attendeeEmail);
                })
                .map((b) => ({
                  alreadyGivenInInterval: alreadyGivenRateLimited.filter(
                    (g) => g.id === b.id
                  ).length,
                  id: b.id,
                  eventName: b.eventName,
                  productName: b.productName,
                  intervalMs,
                  maxInInterval: b.maxPerDay,
                  timestampsGiven: alreadyGivenRateLimited
                    .filter((g) => g.id === b.id)
                    .map((g) => g.timeCreated)
                })),
              ticket: ticketInfo
            };
          }

          // 3) contact action
          if (this.definition.options.ticketActions?.contacts?.enabled) {
            if (actorEmails.includes(ticketInfo.attendeeEmail)) {
              result.getContactActionInfo = {
                permissioned: false,
                alreadyReceived: false
              };
            } else {
              const received = (
                await Promise.all(
                  actorEmails.map((e) =>
                    this.contactDB.getContacts(client, this.id, e)
                  )
                )
              ).flat();
              result.getContactActionInfo = {
                permissioned: true,
                alreadyReceived: received.includes(ticketInfo.attendeeEmail),
                ticket: ticketInfo
              };
            }
          }

          // 4) screen config
          result.actionScreenConfig =
            this.definition.options.ticketActions?.screenConfig;

          return result;
        });
      }
    );
  }

  private getBadgesGiveableByEmail(email: string): BadgeConfig[] {
    return (
      this.definition.options.ticketActions?.badges?.choices ?? []
    ).filter((b: BadgeConfig) => {
      return b.givers?.includes(email) || b.givers?.includes("*") || false;
    });
  }

  /**
   * Perform a check-in.
   * First checks that the checker sent a valid credential, then works out if
   * the ticket is a Lemonade ticket or manually-added, and then calls the
   * appropriate function to attempt a check-in.
   */
  private async executeTicketAction(
    request: PodboxTicketActionRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return traced<PodboxTicketActionResponseValue>(
      LOG_NAME,
      "executeTicketAction",
      async (span): Promise<PodboxTicketActionResponseValue> => {
        return sqlQueryWithPool(this.context.dbPool, async (client) => {
          tracePipeline(this.definition);

          let emails: string[];
          try {
            const verifiedCredential =
              await this.credentialSubservice.verifyAndExpectZupassEmail(
                request.credential
              );
            if (
              !verifiedCredential.emails ||
              verifiedCredential.emails.length === 0
            ) {
              throw new Error("missing emails in credential");
            }
            emails = verifiedCredential.emails.map((e) => e.email);
          } catch (e) {
            logger(`${LOG_TAG} Failed to verify credential due to error: `, e);
            setError(e, span);
            span?.setAttribute("checkin_error", "InvalidSignature");
            return { success: false, error: { name: "InvalidSignature" } };
          }

          const precheck = await this.precheckTicketAction(request);
          logger(
            LOG_TAG,
            `got request to execute ticket action ${str(
              request
            )} - precheck - ${str(precheck)}`
          );

          if (!precheck.success) {
            return precheck;
          }

          if (request.action.getContact) {
            if (!precheck.getContactActionInfo?.permissioned) {
              return {
                success: false,
                error: { name: "InvalidTicket" }
              };
            }

            if (precheck.getContactActionInfo?.alreadyReceived) {
              return {
                success: false,
                error: { name: "AlreadyReceived" }
              };
            }

            const ticketId = request.ticketId;
            const ticket = await this.db.loadById(this.id, ticketId);
            const manualTicket = this.getManualTicketById(ticketId);
            const scaneeEmail = ticket?.email ?? manualTicket?.attendeeEmail;

            if (scaneeEmail) {
              await this.contactDB.saveContact(
                client,
                this.id,
                emails[0],
                scaneeEmail
              );

              return {
                success: true
              };
            } else {
              return {
                success: false,
                error: { name: "InvalidTicket" }
              };
            }
          } else if (request.action.giftBadge) {
            const ticketId = request.ticketId;
            const ticket = await this.db.loadById(this.id, ticketId);
            const manualTicket = this.getManualTicketById(ticketId);
            const recipientEmail = ticket?.email ?? manualTicket?.attendeeEmail;

            const matchingBadges: BadgeConfig[] =
              request.action.giftBadge.badgeIds
                .map((id) =>
                  (
                    this.definition.options?.ticketActions?.badges?.choices ??
                    []
                  ).find((badge) => badge.id === id)
                )
                .filter((badge) => !!badge) as BadgeConfig[];

            const allowedBadges = matchingBadges.filter((b) => {
              const matchingRateLimitedBadge =
                precheck.giveBadgeActionInfo?.rateLimitedBadges?.find(
                  (r) => r.id === b.id
                );

              // prevent too many rate limited badges from being given
              if (matchingRateLimitedBadge) {
                if (
                  matchingRateLimitedBadge.alreadyGivenInInterval >=
                  matchingRateLimitedBadge.maxInInterval
                ) {
                  return false;
                }
              }

              // prevent wrong ppl from issuing wrong badges
              if (
                !b.givers?.includes("*") &&
                !b.givers?.find((e) => emails.includes(e))
              ) {
                return false;
              }

              return true;
            });

            if (recipientEmail) {
              await this.badgeDB.giveBadges(
                client,
                this.id,
                emails[0],
                recipientEmail,
                allowedBadges
              );

              return {
                success: true
              };
            } else {
              return {
                success: false,
                error: { name: "InvalidTicket" }
              };
            }
          } else if (request.action?.checkin) {
            if (precheck.checkinActionInfo?.reason) {
              return {
                success: false,
                error: precheck.checkinActionInfo?.reason
              };
            }

            const autoGrantBadges: BadgeConfig[] = (
              this.definition.options?.ticketActions?.badges?.choices ?? []
            ).filter((badge) => badge.grantOnCheckin);

            // First see if we have an atom which matches the ticket ID
            const ticketAtom = await this.db.loadById(
              this.id,
              request.ticketId
            );
            if (
              ticketAtom &&
              // Ensure that the checker-provided event ID matches the ticket
              this.lemonadeAtomToZupassEventId(ticketAtom) === request.eventId
            ) {
              if (ticketAtom.email) {
                await this.badgeDB.giveBadges(
                  client,
                  this.id,
                  emails[0],
                  ticketAtom.email,
                  autoGrantBadges
                );
              }

              return this.podboxLocalCheckIn(
                {
                  id: ticketAtom.id,
                  eventId: ticketAtom.genericIssuanceEventId,
                  productId: ticketAtom.genericIssuanceProductId,
                  attendeeName: ticketAtom.name,
                  attendeeEmail: ticketAtom.email
                },
                emails[0]
              );
            } else {
              // No valid Lemonade atom found, try looking for a manual ticket
              const manualTicket = this.getManualTicketById(request.ticketId);
              if (manualTicket && manualTicket.eventId === request.eventId) {
                await this.badgeDB.giveBadges(
                  client,
                  this.id,
                  emails[0],
                  manualTicket.attendeeEmail,
                  autoGrantBadges
                );

                // Manual ticket found, check in with the DB
                return this.podboxLocalCheckIn(manualTicket, emails[0]);
              } else {
                // Didn't find any matching ticket
                logger(
                  `${LOG_TAG} Could not find ticket ${request.ticketId} ` +
                    `for event ${
                      request.eventId
                    } for checkin requested by ${JSON.stringify(emails)} ` +
                    `on pipeline ${this.id}`
                );
                span?.setAttribute("checkin_error", "InvalidTicket");
                return { success: false, error: { name: "InvalidTicket" } };
              }
            }
          } else {
            return {
              success: false,
              error: { name: "ServerError" }
            };
          }
        });
      }
    );
  }

  /**
   * Checks a manual ticket into the DB.
   */
  private async podboxLocalCheckIn(
    manualTicket: ManualTicket,
    checkerEmail: string
  ): Promise<PodboxTicketActionResponseValue> {
    return traced<PodboxTicketActionResponseValue>(
      LOG_NAME,
      "checkInManualTicket",
      async (span): Promise<PodboxTicketActionResponseValue> => {
        return sqlQueryWithPool(this.context.dbPool, async (client) => {
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
                checker: LEMONADE_CHECKER
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
                    checker: LEMONADE_CHECKER
                  }
                };
              }
            }
            span?.setAttribute("checkin_error", "ServerError");
            return { success: false, error: { name: "ServerError" } };
          }

          return { success: true };
        });
      }
    );
  }

  /**
   * Check in a ticket to the Lemonade back-end.
   */
  private async lemonadeCheckin(
    ticketAtom: LemonadeAtom,
    userId: string,
    checkerEmail: string
  ): Promise<PodboxTicketActionResponseValue> {
    return traced<PodboxTicketActionResponseValue>(
      LOG_NAME,
      "lemonadeTicketAction",
      async (span): Promise<PodboxTicketActionResponseValue> => {
        if (ticketAtom.checkinDate instanceof Date) {
          span?.setAttribute("checkin_error", "AlreadyCheckedIn");
          return {
            success: false,
            error: {
              name: "AlreadyCheckedIn",
              checkinTimestamp: ticketAtom.checkinDate.toISOString(),
              checker: LEMONADE_CHECKER
            }
          };
        }

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
              checker: LEMONADE_CHECKER
            }
          };
        }

        this.pendingCheckIns.set(ticketAtom.id, {
          status: CheckinStatus.Pending,
          timestamp: Date.now()
        });
        try {
          await this.api.checkinUser(
            this.definition.options.backendUrl,
            this.getOAuthCredentials(),
            ticketAtom.lemonadeEventId,
            userId
          );
          this.pendingCheckIns.set(ticketAtom.id, {
            status: CheckinStatus.Success,
            timestamp: Date.now()
          });
        } catch (e) {
          logger(
            `${LOG_TAG} Failed to check in ticket ${
              ticketAtom.id
            } for event ${this.lemonadeAtomToZupassEventId(
              ticketAtom
            )} on behalf of checker ${checkerEmail} on pipeline ${this.id}`
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

  private getOAuthCredentials(): LemonadeOAuthCredentials {
    return {
      oauthAudience: this.definition.options.oauthAudience,
      oauthClientId: this.definition.options.oauthClientId,
      oauthClientSecret: this.definition.options.oauthClientSecret,
      oauthServerUrl: this.definition.options.oauthServerUrl
    };
  }

  private getEventById(eventId: string): LemonadePipelineEventConfig {
    const eventConfig = this.definition.options.events.find(
      (ev) => ev.genericIssuanceEventId === eventId
    );
    if (!eventConfig) {
      throw new Error(`Could not find event ${eventId} on pipeline ${this.id}`);
    }
    return eventConfig;
  }

  private getTicketTypeById(
    event: LemonadePipelineEventConfig,
    productId: string
  ): LemonadePipelineTicketTypeConfig {
    const ticketTypeConfig = event.ticketTypes.find(
      (ticketType) => ticketType.genericIssuanceProductId === productId
    );
    if (!ticketTypeConfig) {
      throw new Error(
        `Could not find product ${productId} for event ${event.genericIssuanceEventId} on pipeline ${this.id}`
      );
    }
    return ticketTypeConfig;
  }

  /**
   * A summary of data from the manual check-in table.
   */
  private async getManualCheckinSummary(): Promise<PipelineCheckinSummary[]> {
    return traced(LOG_NAME, "getManualCheckinSummary", async (span) => {
      return sqlQueryWithPool(this.context.dbPool, async (client) => {
        const results: PipelineCheckinSummary[] = [];
        const checkIns = await this.checkinDB.getByPipelineId(client, this.id);
        const checkInsById = _.keyBy(checkIns, (checkIn) => checkIn.ticketId);

        for (const ticketAtom of await this.db.load(this.id)) {
          const checkIn = checkInsById[ticketAtom.id];
          results.push({
            ticketId: ticketAtom.id,
            ticketName: this.lemonadeAtomToTicketName(ticketAtom),
            email: ticketAtom.email,
            timestamp: checkIn ? checkIn.timestamp.toISOString() : "",
            checkerEmail: checkIn ? checkIn.checkerEmail : undefined,
            checkedIn: !!checkIn
          });
        }

        for (const manualTicket of this.definition.options.manualTickets ??
          []) {
          const checkIn = checkInsById[manualTicket.id];
          const event = this.getEventById(manualTicket.eventId);
          const product = this.getTicketTypeById(event, manualTicket.productId);
          results.push({
            ticketId: manualTicket.id,
            ticketName: product.name,
            email: manualTicket.attendeeEmail,
            timestamp: checkIn ? checkIn.timestamp.toISOString() : "",
            checkerEmail: checkIn ? checkIn.checkerEmail : undefined,
            checkedIn: !!checkIn
          });
        }

        span?.setAttribute("result_count", results.length);
        return results;
      });
    });
  }

  private async setManualCheckInState(
    ticketId: string,
    checkInState: boolean,
    checkerEmail: string
  ): Promise<PipelineSetManualCheckInStateResponseValue> {
    return traced(LOG_NAME, "setManualCheckInState", async (span) => {
      return sqlQueryWithPool(this.context.dbPool, async (client) => {
        span?.setAttribute("ticket_id", ticketId);
        span?.setAttribute("checkin_state", checkInState);
        span?.setAttribute("checker_email", checkerEmail);
        const atom = await this.db.loadById(this.id, ticketId);
        if (!atom) {
          const manualTicket = (
            this.definition.options.manualTickets ?? []
          ).find((m) => m.id === ticketId);
          if (!manualTicket) {
            throw new PCDHTTPError(
              404,
              `Ticket ${ticketId} does not exist on pipeline ${this.id}`
            );
          }
        }

        logger(
          `${LOG_TAG} Setting manual check-in state to ${
            checkInState ? "checked-in" : "checked-out"
          } for ticket ${ticketId} on pipeline ${this.id}`
        );

        if (checkInState) {
          await this.checkinDB.checkIn(
            client,
            this.id,
            ticketId,
            new Date(),
            checkerEmail
          );
        } else {
          await this.checkinDB.deleteCheckIn(client, this.id, ticketId);
        }

        return { checkInState };
      });
    });
  }

  public static is(p: Pipeline | undefined): p is LemonadePipeline {
    return p?.type === PipelineType.Lemonade;
  }

  public async sendPipelineEmail(
    client: PoolClient,
    emailType: PipelineEmailType
  ): Promise<GenericIssuanceSendPipelineEmailResponseValue> {
    return traced(LOG_NAME, "sendPipelineEmail", async () => {
      try {
        if (this.sendingEmail) {
          throw new PCDHTTPError(400, "email send already in progress");
        }

        this.sendingEmail = true;

        if (this.id !== "c00d3470-7ff8-4060-adc1-e9487d607d42") {
          throw new PCDHTTPError(
            400,
            "only the edge esmeralda pipeline can send emails right now"
          );
        }

        const allAtoms = await this.db.load(this.id);
        const manualCheckins = await this.checkinDB.getByPipelineId(
          client,
          this.id
        );
        const sentEmails = await this.emailDB.getSentEmails(
          client,
          this.id,
          PipelineEmailType.EsmeraldaOneClick
        );
        const encounteredEmails = new Set<string>(
          sentEmails.map((sentEmail) => sentEmail.emailAddress)
        );
        const filteredAtoms = allAtoms.filter((ticket) => {
          if (
            manualCheckins.find((checkin) => checkin.ticketId === ticket.id)
          ) {
            return false;
          }

          if (encounteredEmails.has(ticket.email)) {
            return false;
          }

          encounteredEmails.add(ticket.email);

          return true;
        });

        logger(
          LOG_TAG,
          `SEND_PIPELINE_EMAIL`,
          this.id,
          emailType,
          `atom_count`,
          allAtoms.length,
          `manual_checkin_count`,
          manualCheckins.length,
          `already_sent_emails`,
          sentEmails.length,
          `to_send_emails`,
          filteredAtoms.length
        );

        for (const toSend of filteredAtoms) {
          try {
            await this.emailDB.recordEmailSent(
              client,
              this.id,
              PipelineEmailType.EsmeraldaOneClick,
              toSend.email
            );
            const passportClientUrl = process.env.PASSPORT_CLIENT_URL;

            if (!passportClientUrl) {
              throw new Error("missing process.env.PASSPORT_CLIENT_URL");
            }

            // this is deliberately not awaited as we want the http response to the
            // request to send these emails to return immediately. the emails are sent via
            // a queue in {@link EmailAPI}
            this.emailService.sendEsmeraldaOneClickEmail(
              toSend.email,
              urljoin(
                passportClientUrl,
                `/#/one-click-login/${encodeURIComponent(toSend.email)}/${
                  toSend.lemonadeTicketId
                }/Edge%20Esmeralda`
              )
            );
          } catch (e) {
            logger(
              LOG_NAME,
              `failed to send email for address ${toSend.email}`,
              e
            );
          }
        }

        return { queued: filteredAtoms.length };
      } finally {
        this.sendingEmail = false;
      }
    });
  }

  /**
   * Retrieves ZuAuth configuration for this pipeline's PCDs.
   */
  private async getZuAuthConfig(): Promise<PipelineEdDSATicketZuAuthConfig[]> {
    const publicKey = await getEdDSAPublicKey(this.eddsaPrivateKey);
    const metadata = this.definition.options.events.flatMap((ev) =>
      ev.ticketTypes.map(
        (ticketType) =>
          ({
            pcdType: "eddsa-ticket-pcd",
            publicKey,
            eventId: ev.genericIssuanceEventId,
            eventName: ev.name,
            productId: ticketType.genericIssuanceProductId,
            productName: ticketType.name
          }) satisfies PipelineEdDSATicketZuAuthConfig
      )
    );
    return metadata;
  }

  /**
   * Returns all of the IDs associated with a Lemonade pipeline definition.
   */
  public static uniqueIds(definition: LemonadePipelineDefinition): string[] {
    const ids = [definition.id];

    for (const event of definition.options.events) {
      ids.push(event.genericIssuanceEventId);

      for (const product of event.ticketTypes) {
        ids.push(product.genericIssuanceProductId);
      }
    }

    for (const semaphoreGroup of definition.options.semaphoreGroups ?? []) {
      ids.push(semaphoreGroup.groupId);
    }

    for (const manualTicket of definition.options.manualTickets ?? []) {
      ids.push(manualTicket.id);
    }

    return ids;
  }
}

/**
 * Intermediate representation which the {@link LemonadePipeline} uses to
 * save tickets, in order to be able to issue tickets based on them later on.
 */
export interface LemonadeAtom extends PipelineAtom {
  name: string;
  email: string;
  lemonadeEventId: string;
  lemonadeTicketTypeId: string;
  genericIssuanceEventId: string;
  genericIssuanceProductId: string;
  lemonadeUserId: string | undefined;
  checkinDate: Date | null;
  lemonadeTicketId: string;
}

export function isLemonadeAtom(atom: PipelineAtom): atom is LemonadeAtom {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (atom as any).lemonadeEventId !== undefined;
}
