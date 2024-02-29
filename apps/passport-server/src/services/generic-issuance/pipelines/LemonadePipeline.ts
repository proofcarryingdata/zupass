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
  ActionConfigResponseValue,
  BadgeConfig,
  CONTACT_EVENT_NAME,
  GenericIssuanceCheckInRequest,
  GenericIssuancePreCheckRequest,
  LemonadePipelineDefinition,
  LemonadePipelineEventConfig,
  LemonadePipelineTicketTypeConfig,
  ManualTicket,
  PipelineLoadSummary,
  PipelineLog,
  PipelineSemaphoreGroupInfo,
  PipelineType,
  PodboxTicketActionError,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  TicketInfo,
  verifyFeedCredential,
  verifyTicketActionCredential
} from "@pcd/passport-interface";
import { PCDAction, PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { str } from "@pcd/util";
import { randomUUID } from "crypto";
import PQueue from "p-queue";
import { DatabaseError } from "pg";
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
import { IPipelineSemaphoreHistoryDB } from "../../../database/queries/pipelineSemaphoreHistoryDB";
import {
  IBadgeGiftingDB,
  IContactSharingDB
} from "../../../database/queries/ticketActionDBs";
import { logger } from "../../../util/logger";
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
import { BasePipelineCapability } from "../types";
import { makePLogErr, makePLogInfo, makePLogWarn } from "../util";
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

  /**
   * Used to sign {@link EdDSATicketPCD}
   */
  private eddsaPrivateKey: string;
  private definition: LemonadePipelineDefinition;
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
  private db: IPipelineAtomDB<LemonadeAtom>;
  private checkinDB: IPipelineCheckinDB;
  private contactDB: IContactSharingDB;
  private badgeDB: IBadgeGiftingDB;
  private api: ILemonadeAPI;
  private cacheService: PersistentCacheService;
  private loaded: boolean;
  private consumerDB: IPipelineConsumerDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private semaphoreGroupProvider: SemaphoreGroupProvider | undefined;
  private semaphoreUpdateQueue: PQueue;

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
    zupassPublicKey: EdDSAPublicKey,
    cacheService: PersistentCacheService,
    checkinDB: IPipelineCheckinDB,
    contactDB: IContactSharingDB,
    badgeDB: IBadgeGiftingDB,
    consumerDB: IPipelineConsumerDB,
    semaphoreHistoryDB: IPipelineSemaphoreHistoryDB
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<LemonadeAtom>;
    this.contactDB = contactDB;
    this.badgeDB = badgeDB;
    this.api = api;
    this.zupassPublicKey = zupassPublicKey;
    this.loaded = false;

    if ((this.definition.options.semaphoreGroups ?? []).length > 0) {
      this.semaphoreGroupProvider = new SemaphoreGroupProvider(
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
        )
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
        preCheck: this.precheckTicketAction.bind(this)
      } satisfies CheckinCapability,
      {
        type: PipelineCapability.SemaphoreGroup,
        getSerializedLatestGroup: async (
          groupId: string
        ): Promise<SerializedSemaphoreGroup | undefined> => {
          return this.semaphoreGroupProvider?.getSerializedLatestGroup(groupId);
        },
        getLatestGroupRoot: async (
          groupId: string
        ): Promise<string | undefined> => {
          return this.semaphoreGroupProvider?.getLatestGroupRoot(groupId);
        },
        getSerializedHistoricalGroup: async (
          groupId: string,
          rootHash: string
        ): Promise<SerializedSemaphoreGroup | undefined> => {
          return this.semaphoreGroupProvider?.getSerializedHistoricalGroup(
            groupId,
            rootHash
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

  public async start(): Promise<void> {
    // On startup, the pipeline definition may have changed, and manual tickets
    // may have been deleted. If so, clean up any check-ins for those tickets.
    await this.cleanUpManualCheckins();
    // Initialize the Semaphore Group provider by loading groups from the DB,
    // if one exists.
    await this.semaphoreGroupProvider?.start();
  }

  public async stop(): Promise<void> {
    logger(LOG_TAG, `stopping LemonadePipeline with id ${this.id}`);
    // TODO: what to actually do for a stopped pipeline?
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
                  // Tickets can appear for users who have been invited to the
                  // event, but have not registered with Lemonade. Such tickets
                  // can't be checked in, so we should avoid creating ticket PCDs
                  // for them. We can detect this by checking for a `user_email`
                  // value with content.
                  if (ticket.user_email.length > 0) {
                    validTickets.push(ticket);
                  } else {
                    const message = `ticket owner hasn't created lemonade account ${str(
                      ticket
                    )} , pipeline '${this.id}'`;
                    logs.push(makePLogWarn(message));
                    logger(`${LOG_TAG} ${message}`);
                    atomsExpected--;
                  }
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

            this.loaded = true;

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
                email: t.user_email.toLowerCase(),
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
                checkinDate: t.checkin_date
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
        await this.triggerSemaphoreGroupUpdate();
      }

      return {
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
          email: atom.email as string,
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
  public async triggerSemaphoreGroupUpdate(): Promise<void> {
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
        await this.semaphoreGroupProvider?.update(data);
      });
    });
  }

  /**
   * If manual tickets are removed after being checked in, they can leave
   * orphaned check-in data behind. This method cleans those up.
   */
  private async cleanUpManualCheckins(): Promise<void> {
    return traced(LOG_NAME, "cleanUpManualCheckins", async (span) => {
      const ticketIds = new Set(
        (this.definition.options.manualTickets ?? []).map(
          (manualTicket) => manualTicket.id
        )
      );
      const checkIns = await this.checkinDB.getByPipelineId(this.id);
      for (const checkIn of checkIns) {
        if (!ticketIds.has(checkIn.ticketId)) {
          logger(
            `${LOG_TAG} Deleting orphaned check-in for ${checkIn.ticketId} on pipeline ${this.id}`
          );
          span?.setAttribute("deleted_checkin_ticket_id", checkIn.ticketId);

          this.checkinDB.deleteCheckIn(this.id, checkIn.ticketId);
        }
      }
    });
  }

  private async manualTicketToTicketData(
    manualTicket: ManualTicket,
    sempahoreId: string
  ): Promise<ITicketData> {
    const event = this.getEventById(manualTicket.eventId);
    const product = this.getTicketTypeById(event, manualTicket.productId);

    const checkIn = await this.checkinDB.getByTicketId(
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
    email: string
  ): Promise<SerializedPCD<EdDSATicketPCD>[]> {
    const badges = await this.badgeDB.getBadges(this.id, email);

    const badgePCDs = await Promise.all(
      badges.map(async (b) => {
        const badgeConfig =
          this.definition.options.ticketActions?.badges?.choices?.find(
            (c) => c.id === b.id
          );

        if (!badgeConfig) {
          return undefined;
        }

        const eventId = uuidv5(
          `badge-${badgeConfig.id}-${badgeConfig.eventName}-${badgeConfig.productName}`,
          this.id
        );
        const productId = uuidv5(`product-${eventId}`, this.id);
        const ticketId = uuidv5(`ticket-${productId}-${email}`, this.id);

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
                imageAltText: undefined,
                // The fields below are signed using the passport-server's private EdDSA key
                // and can be used by 3rd parties to represent their own tickets.
                eventId, // The event ID uniquely identifies an event.
                productId, // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
                ticketId, // The ticket ID is a unique identifier of the ticket.
                timestampConsumed: 0,
                timestampSigned: Date.now(),
                attendeeSemaphoreId: "",
                isConsumed: false,
                isRevoked: false,
                ticketCategory: TicketCategory.Generic,
                attendeeName: "",
                attendeeEmail: ""
              }
            }
          })
        );
      })
    );

    return badgePCDs.filter((pcd) => !!pcd) as SerializedPCD<EdDSATicketPCD>[];
  }

  private async getReceivedContactsForEmail(
    email: string
  ): Promise<SerializedPCD<EdDSATicketPCD>[]> {
    const contacts = await this.contactDB.getContacts(this.id, email);
    return Promise.all(
      contacts.map(async (contact) => {
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
                imageAltText: undefined,
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
                attendeeName: "",
                attendeeEmail: contact
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
    email: string,
    identityCommitment: string
  ): Promise<EdDSATicketPCD[]> {
    // Load atom-backed tickets
    const relevantTickets = await this.db.loadByEmail(this.id, email);
    // Convert atoms to ticket data
    const ticketDatas = relevantTickets.map((t) =>
      this.atomToTicketData(t, identityCommitment)
    );
    // Load manual tickets from the definition
    const manualTickets = this.getManualTicketsForEmail(email);
    // Convert manual tickets to ticket data and add to array
    ticketDatas.push(
      ...(await Promise.all(
        manualTickets.map((manualTicket) =>
          this.manualTicketToTicketData(manualTicket, identityCommitment)
        )
      ))
    );

    // Turn ticket data into PCDs
    const tickets = await Promise.all(
      ticketDatas.map((t) => this.getOrGenerateTicket(t))
    );

    return tickets;
  }

  private async issueLemonadeTicketPCDs(
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return traced(LOG_NAME, "issueLemonadeTicketPCDs", async (span) => {
      tracePipeline(this.definition);

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

      const now = new Date();

      if ((this.definition.options.semaphoreGroups ?? []).length > 0) {
        // Consumer is validated, so save them in the consumer list
        const consumer = await this.consumerDB.save(
          this.id,
          emailPCD.claim.emailAddress,
          emailPCD.claim.semaphoreId,
          now
        );

        // If the update time is now, that means our save() operation caused
        // a change in the consumer DB, and we have to update the Semaphore
        // groups. This is rare, since most saves will not cause a change.
        // It will, however, always occur the first time the user hits a
        // feed with Semaphore groups enabled (which might not be the first
        // time they *ever* hit that feed, if Semaphore groups were not
        // initialy enabled).
        // It seems reasonable to await on the update here, even though it will
        // slow down the response time, as it ensures that the user is present
        // in all of the necessary Semaphore groups.
        if (consumer.timeUpdated.getTime() === now.getTime()) {
          span?.setAttribute("semaphore_groups_updated", true);
          await this.triggerSemaphoreGroupUpdate();
        }
      }

      const email = emailPCD.claim.emailAddress.toLowerCase();
      span?.setAttribute("email", email);
      span?.setAttribute("semaphore_id", emailPCD.claim.semaphoreId);

      const tickets = await this.getTicketsForEmail(
        email,
        credential.claim.identityCommitment
      );

      const ticketActions: PCDAction[] = [];

      if (this.loaded) {
        ticketActions.push({
          type: PCDActionType.DeleteFolder,
          folder: this.definition.options.feedOptions.feedFolder,
          recursive: true
        });
      }

      ticketActions.push({
        type: PCDActionType.ReplaceInFolder,
        folder: this.definition.options.feedOptions.feedFolder,
        pcds: await Promise.all(
          tickets.map((t) => EdDSATicketPCDPackage.serialize(t))
        )
      });

      const contactsFolder = `${this.definition.options.feedOptions.feedFolder}/contacts`;
      const contacts = await this.getReceivedContactsForEmail(email);
      const contactActions: PCDAction[] = [
        {
          type: PCDActionType.DeleteFolder,
          folder: contactsFolder,
          recursive: true
        },
        {
          type: PCDActionType.ReplaceInFolder,
          folder: contactsFolder,
          pcds: contacts
        }
      ];

      const badgeFolder = `${this.definition.options.feedOptions.feedFolder}/badges`;
      const badges = await this.getReceivedBadgesForEmail(email);
      const badgeActions: PCDAction[] = [
        {
          type: PCDActionType.DeleteFolder,
          folder: badgeFolder,
          recursive: true
        },
        {
          type: PCDActionType.ReplaceInFolder,
          folder: badgeFolder,
          pcds: badges
        }
      ];

      traceFlattenedObject(span, {
        pcds_issued: tickets.length + badges.length + contacts.length,
        tickets_issued: tickets.length,
        badges_issued: badges.length,
        contacts_issued: contacts.length
      });

      return {
        actions: [...ticketActions, ...contactActions, ...badgeActions]
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
      JSON.stringify(ticketCopy) + eddsaPrivateKey + pipelineId
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
    if (!atom.email) {
      throw new Error(`Atom missing email: ${atom.id} in pipeline ${this.id}`);
    }

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
   * Given an event and a checker email, verifies that the checker has permission to perform
   * check-ins for the event.
   */
  private async canCheckInForEvent(
    eventId: string,
    checkerEmail: string
  ): Promise<true | PodboxTicketActionError> {
    const eventConfig = this.definition.options.events.find(
      (e) => e.genericIssuanceEventId === eventId
    );

    if (!eventConfig) {
      return { name: "InvalidTicket" };
    }

    // Collect all of the product IDs that the checker owns for this event
    const checkerProductIds: string[] = [];
    for (const checkerTicketAtom of await this.db.loadByEmail(
      this.id,
      checkerEmail
    )) {
      if (checkerTicketAtom.genericIssuanceEventId === eventId) {
        checkerProductIds.push(checkerTicketAtom.genericIssuanceProductId);
      }
    }
    for (const manualTicket of this.getManualTicketsForEmail(checkerEmail)) {
      if (manualTicket.eventId === eventConfig.genericIssuanceEventId) {
        checkerProductIds.push(manualTicket.productId);
      }
    }

    const checkerEmailIsSuperuser =
      this.definition.options.superuserEmails?.includes(checkerEmail) ?? false;

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
    manualTicket: ManualTicket
  ): Promise<true | PodboxTicketActionError> {
    return traced(LOG_NAME, "canCheckInManualTicket", async (span) => {
      // Is the ticket already checked in?
      const checkIn = await this.checkinDB.getByTicketId(
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
    request: GenericIssuancePreCheckRequest
  ): Promise<ActionConfigResponseValue> {
    return traced<ActionConfigResponseValue>(
      LOG_NAME,
      "precheckTicketAction",
      async (span): Promise<ActionConfigResponseValue> => {
        tracePipeline(this.definition);

        let actorEmail: string;

        const result: ActionConfigResponseValue = {
          success: true,
          giveBadgeActionInfo: undefined,
          checkinActionInfo: undefined,
          getContactActionInfo: undefined
        };

        let payload;
        // 1) verify that the requester is who they say they are
        try {
          payload = await verifyTicketActionCredential(request.credential);
          span?.setAttribute("ticket_id", payload.ticketId);

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

            return { success: false, error: { name: "InvalidSignature" } };
          }

          span?.setAttribute(
            "checker_email",
            checkerEmailPCD.claim.emailAddress
          );
          span?.setAttribute(
            "checked_semaphore_id",
            checkerEmailPCD.claim.semaphoreId
          );

          actorEmail = checkerEmailPCD.claim.emailAddress;
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
        const manualTicket = this.getManualTicketById(payload.ticketId);
        const ticketAtom = await this.db.loadById(this.id, payload.ticketId);
        let ticketInfo: TicketInfo;
        let notCheckedIn;

        if (ticketAtom) {
          eventConfig = this.lemonadeAtomToEvent(ticketAtom);
          ticketInfo = {
            eventName: eventConfig.name,
            ticketName: this.lemonadeAtomToTicketName(ticketAtom),
            attendeeEmail: ticketAtom.email as string,
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
          notCheckedIn = await this.notCheckedInManual(manualTicket);
        } else {
          return {
            success: false,
            error: { name: "InvalidTicket" }
          };
        }

        // 1) checkin action
        const canCheckIn = await this.canCheckInForEvent(
          payload.eventId,
          actorEmail
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
          const badgesGiven = await this.badgeDB.getBadges(
            this.id,
            ticketInfo.attendeeEmail
          );

          const badgesGiveableByUser =
            this.getBadgesGiveableByEmail(actorEmail);

          const notAlreadyGivenBadges = badgesGiveableByUser.filter(
            (c) => !badgesGiven.find((b) => b.id === c.id)
          );

          result.giveBadgeActionInfo = {
            permissioned: badgesGiveableByUser.length > 0,
            giveableBadges: notAlreadyGivenBadges,
            ticket: ticketInfo
          };
        }

        // 3) contact action
        if (this.definition.options.ticketActions?.contacts?.enabled) {
          if (actorEmail === ticketInfo.attendeeEmail) {
            result.getContactActionInfo = {
              permissioned: false,
              alreadyReceived: false
            };
          } else {
            const received = await this.contactDB.getContacts(
              this.id,
              actorEmail
            );
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
      }
    );
  }

  private getBadgesGiveableByEmail(email: string): BadgeConfig[] {
    return (
      this.definition.options.ticketActions?.badges?.choices ?? []
    ).filter((b: BadgeConfig) => {
      return b.givers?.includes(email) ?? false;
    });
  }

  /**
   * Perform a check-in.
   * First checks that the checker sent a valid credential, then works out if
   * the ticket is a Lemonade ticket or manually-added, and then calls the
   * appropriate function to attempt a check-in.
   */
  private async executeTicketAction(
    request: GenericIssuanceCheckInRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return traced<PodboxTicketActionResponseValue>(
      LOG_NAME,
      "executeTicketAction",
      async (span): Promise<PodboxTicketActionResponseValue> => {
        tracePipeline(this.definition);

        const payload = await verifyTicketActionCredential(request.credential);
        const emailPCD = await EmailPCDPackage.deserialize(
          payload.emailPCD.pcd
        );
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

        if (payload.action.getContact) {
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

          const ticketId = payload.ticketId;
          const ticket = await this.db.loadById(this.id, ticketId);
          const manualTicket = this.getManualTicketById(ticketId);
          const scannerEmail = emailPCD.claim.emailAddress;
          const scaneeEmail = ticket?.email ?? manualTicket?.attendeeEmail;

          if (scaneeEmail) {
            await this.contactDB.saveContact(
              this.id,
              scannerEmail,
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
        } else if (payload.action.giftBadge) {
          const ticketId = payload.ticketId;
          const ticket = await this.db.loadById(this.id, ticketId);
          const manualTicket = this.getManualTicketById(ticketId);
          const recipientEmail = ticket?.email ?? manualTicket?.attendeeEmail;

          if (recipientEmail) {
            const matchingBadges: BadgeConfig[] =
              payload.action.giftBadge.badgeIds
                .map((id) =>
                  (
                    this.definition.options?.ticketActions?.badges?.choices ??
                    []
                  ).find((badge) => badge.id === id)
                )
                .filter((badge) => !!badge) as BadgeConfig[];

            await this.badgeDB.giveBadges(
              this.id,
              emailPCD.claim.emailAddress,
              recipientEmail,
              matchingBadges
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
        } else if (payload.action?.checkin) {
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
          const ticketAtom = await this.db.loadById(this.id, payload.ticketId);
          if (
            ticketAtom &&
            // Ensure that the checker-provided event ID matches the ticket
            this.lemonadeAtomToZupassEventId(ticketAtom) === payload.eventId
          ) {
            if (ticketAtom.email) {
              await this.badgeDB.giveBadges(
                this.id,
                emailPCD.claim.emailAddress,
                ticketAtom.email,
                autoGrantBadges
              );
            }

            // We found a Lemonade atom, so check in with the Lemonade backend
            return this.lemonadeCheckin(
              ticketAtom,
              emailPCD.claim.emailAddress
            );
          } else {
            // No Lemonade atom found, try looking for a manual ticket
            const manualTicket = this.getManualTicketById(payload.ticketId);
            if (manualTicket && manualTicket.eventId === payload.eventId) {
              await this.badgeDB.giveBadges(
                this.id,
                emailPCD.claim.emailAddress,
                manualTicket.attendeeEmail,
                autoGrantBadges
              );

              // Manual ticket found, check in with the DB
              return this.checkInManualTicket(
                manualTicket,
                emailPCD.claim.emailAddress
              );
            } else {
              // Didn't find any matching ticket
              logger(
                `${LOG_TAG} Could not find ticket ${payload.ticketId} ` +
                  `for event ${payload.eventId} for checkin requested by ${emailPCD.claim.emailAddress} ` +
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
      }
    );
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
          await this.checkinDB.checkIn(this.id, manualTicket.id, new Date());
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
      }
    );
  }

  /**
   * Check in a ticket to the Lemonade back-end.
   */
  private async lemonadeCheckin(
    ticketAtom: LemonadeAtom,
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
            ticketAtom.lemonadeUserId
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

  public static is(p: Pipeline): p is LemonadePipeline {
    return p.type === PipelineType.Lemonade;
  }
}

/**
 * Intermediate representation which the {@link LemonadePipeline} uses to
 * save tickets, in order to be able to issue tickets based on them later on.
 */
export interface LemonadeAtom extends PipelineAtom {
  name: string;
  lemonadeEventId: string;
  lemonadeTicketTypeId: string;
  genericIssuanceEventId: string;
  genericIssuanceProductId: string;
  lemonadeUserId: string;
  checkinDate: Date | null;
}
