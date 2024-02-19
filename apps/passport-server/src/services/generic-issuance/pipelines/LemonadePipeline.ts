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
  GenericIssuanceCheckInError,
  GenericIssuanceCheckInRequest,
  GenericIssuanceCheckInResponseValue,
  GenericIssuancePreCheckRequest,
  GenericIssuancePreCheckResponseValue,
  LemonadePipelineDefinition,
  LemonadePipelineEventConfig,
  ManualTicket,
  PipelineDefinition,
  PipelineLoadSummary,
  PipelineLog,
  PipelineType,
  PollFeedRequest,
  PollFeedResponseValue,
  verifyCheckinCredential,
  verifyFeedCredential
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { str } from "@pcd/util";
import { v5 as uuidv5 } from "uuid";
import { LemonadeOAuthCredentials } from "../../../apis/lemonade/auth";
import { ILemonadeAPI } from "../../../apis/lemonade/lemonadeAPI";
import { LemonadeTicketSchema } from "../../../apis/lemonade/types";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { logger } from "../../../util/logger";
import { PersistentCacheService } from "../../persistentCacheService";
import { setError, traced } from "../../telemetryService";
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
import { tracePipeline } from "../honeycombQueries";
import { BasePipelineCapability } from "../types";
import { makePLogErr, makePLogInfo, makePLogWarn } from "../util";
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
  private api: ILemonadeAPI;
  private cacheService: PersistentCacheService;

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
    cacheService: PersistentCacheService
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
        preCheck: this.checkLemonadeTicketPCDCanBeCheckedIn.bind(this)
      } satisfies CheckinCapability
    ] as unknown as BasePipelineCapability[];
    this.pendingCheckIns = new Map();
    this.cacheService = cacheService;
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

      const credentials: LemonadeOAuthCredentials = {
        oauthAudience: this.definition.options.oauthAudience,
        oauthClientId: this.definition.options.oauthClientId,
        oauthClientSecret: this.definition.options.oauthClientSecret,
        oauthServerUrl: this.definition.options.oauthServerUrl
      };

      const configuredEvents = this.definition.options.events;

      let atomsExpected = 0;

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
                lemonadeUserId: t.user_id,
                checkinDate: t.checkin_date
              }) as LemonadeAtom
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

      return {
        latestLogs: logs,
        lastRunEndTimestamp: end.toISOString(),
        lastRunStartTimestamp: loadStart.toISOString(),
        atomsLoaded: atomsToSave.length,
        atomsExpected: atomsExpected,
        errorMessage: undefined,
        success: true
      } satisfies PipelineLoadSummary;
    });
  }

  private manualTicketToTicketData(
    manualTicket: ManualTicket,
    sempahoreId: string
  ): ITicketData {
    const event = this.definition.options.events.find(
      (event) => event.genericIssuanceEventId === manualTicket.eventId
    );

    /**
     * This should never happen, due to validation of the pipeline definition
     * during parsing. See {@link LemonadePipelineOptionsSchema}.
     */
    if (!event) {
      throw new Error(
        `Manual ticket specifies non-existent event ID ${manualTicket.eventId} on pipeline ${this.id}`
      );
    }
    const product = event.ticketTypes.find(
      (product) => product.genericIssuanceProductId === manualTicket.productId
    );
    // As above, this should be prevented by pipeline definition validation
    if (!product) {
      throw new Error(
        `Manual ticket specifies non-existent product ID ${manualTicket.productId} on pipeline ${this.id}`
      );
    }
    return {
      ticketId: manualTicket.id,
      eventId: manualTicket.eventId,
      productId: manualTicket.productId,
      attendeeEmail: manualTicket.attendeeEmail,
      attendeeName: manualTicket.attendeeName,
      attendeeSemaphoreId: sempahoreId,
      isConsumed: false,
      isRevoked: false,
      timestampSigned: Date.now(),
      timestampConsumed: 0,
      ticketCategory: TicketCategory.Generic,
      eventName: event.name,
      ticketName: product.name,
      checkerEmail: undefined
    };
  }

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
    const manualTickets = this.definition.options.manualTickets.filter(
      (manualTicket) => {
        return manualTicket.attendeeEmail.toLowerCase() === email;
      }
    );
    // Convert manual tickets to ticket data and add to array
    ticketDatas.push(
      ...manualTickets.map((manualTicket) =>
        this.manualTicketToTicketData(manualTicket, identityCommitment)
      )
    );

    // Turn ticket data into PCDs
    const tickets = await Promise.all(
      ticketDatas.map((t) => this.getOrGenerateTicket(t))
    );

    return tickets;
  }

  /**
   * TODO:
   * - proper validation of credentials.
   * - be robust to any single ticket failing to convert.
   */
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

      const email = emailPCD.claim.emailAddress.toLowerCase();
      span?.setAttribute("email", email);
      span?.setAttribute("semaphore_id", emailPCD.claim.semaphoreId);

      const tickets = await this.getTicketsForEmail(
        email,
        credential.claim.identityCommitment
      );

      span?.setAttribute("pcds_issued", tickets.length);

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
      eventId: this.lemonadeAtomToZupassEventId(atom),
      productId: this.lemonadeAtomToZupassProductId(atom),
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
   * Given a ticket to check in, and the email address of the user performing
   * the check-in, verify that at least one of the user's tickets belongs to a
   * matching event and is a superuser ticket.
   *
   * Returns true if the user has the permission to check the ticket in, or an
   * error if not.
   */
  private async canCheckIn(
    ticketAtom: LemonadeAtom,
    checkerEmail: string
  ): Promise<true | GenericIssuanceCheckInError> {
    const lemonadeEventId = ticketAtom.lemonadeEventId;
    const lemonadeTicketType = ticketAtom.lemonadeTicketTypeId;

    const eventConfig = this.definition.options.events.find(
      (e) => e.externalId === lemonadeEventId
    );

    if (!eventConfig) {
      return { name: "InvalidTicket" };
    }

    const ticketTypeConfig = eventConfig.ticketTypes.find(
      (t) => t.externalId === lemonadeTicketType
    );

    if (!ticketTypeConfig) {
      return { name: "InvalidTicket" };
    }

    // Collect all of the product IDs that the checker owns for this event
    const checkerProductIds: string[] = [];
    for (const checkerTicketAtom of await this.db.loadByEmail(
      this.id,
      checkerEmail
    )) {
      if (checkerTicketAtom.lemonadeEventId === lemonadeEventId) {
        checkerProductIds.push(
          this.lemonadeAtomToZupassProductId(checkerTicketAtom)
        );
      }
    }
    for (const manualTicket of this.definition.options.manualTickets) {
      if (
        manualTicket.attendeeEmail.toLowerCase() === checkerEmail &&
        manualTicket.eventId === eventConfig.genericIssuanceEventId
      ) {
        checkerProductIds.push(manualTicket.productId);
      }
    }

    const checkerEmailIsSuperuser =
      this.definition.options.superuserEmails?.includes(checkerEmail) ?? false;

    const checkerEventTicketTypes = checkerProductIds.map((productId) => {
      const ticketTypeConfig = eventConfig.ticketTypes.find(
        (ticketTypes) => ticketTypes.genericIssuanceProductId === productId
      );
      return ticketTypeConfig;
    });
    const hasSuperUserTicket = checkerEventTicketTypes.find(
      (t) => t?.isSuperUser
    );

    if (!hasSuperUserTicket && !checkerEmailIsSuperuser) {
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
    return traced(
      LOG_NAME,
      "checkLemonadeTicketPCDCanBeCheckedIn",
      async (span) => {
        tracePipeline(this.definition);

        let checkerEmail: string;
        let ticketId: string;

        try {
          const payload = await verifyCheckinCredential(request.credential);
          ticketId = payload.ticketIdToCheckIn;
          const checkerEmailPCD = payload.emailPCD;

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

          span?.setAttribute("ticket_id", ticketId);
          span?.setAttribute(
            "checker_email",
            checkerEmailPCD.claim.emailAddress
          );
          span?.setAttribute(
            "checked_semaphore_id",
            checkerEmailPCD.claim.semaphoreId
          );

          checkerEmail = checkerEmailPCD.claim.emailAddress;
        } catch (e) {
          logger(`${LOG_TAG} Failed to verify credential due to error: `, e);
          setError(e, span);
          span?.setAttribute("precheck_error", "InvalidSignature");
          return { canCheckIn: false, error: { name: "InvalidSignature" } };
        }

        const ticketAtom = await this.db.loadById(this.id, ticketId);
        if (!ticketAtom) {
          span?.setAttribute("precheck_error", "InvalidTicket");
          return { canCheckIn: false, error: { name: "InvalidTicket" } };
        }

        // Check permissions
        const canCheckInResult = await this.canCheckIn(
          ticketAtom,
          checkerEmail
        );

        if (canCheckInResult === true) {
          if (ticketAtom.checkinDate instanceof Date) {
            span?.setAttribute("precheck_error", "AlreadyCheckedIn");
            return {
              canCheckIn: false,
              error: {
                name: "AlreadyCheckedIn",
                checkinTimestamp: ticketAtom.checkinDate.toISOString(),
                checker: LEMONADE_CHECKER
              }
            };
          }

          let pendingCheckin;
          if ((pendingCheckin = this.pendingCheckIns.get(ticketAtom.id))) {
            if (
              pendingCheckin.status === CheckinStatus.Pending ||
              pendingCheckin.status === CheckinStatus.Success
            ) {
              span?.setAttribute("precheck_error", "AlreadyCheckedIn");
              return {
                canCheckIn: false,
                error: {
                  name: "AlreadyCheckedIn",
                  checkinTimestamp: new Date(
                    pendingCheckin.timestamp
                  ).toISOString(),
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
          span?.setAttribute("precheck_error", canCheckInResult.name);
          return { canCheckIn: false, error: canCheckInResult };
        }
      }
    );
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
    return traced(LOG_NAME, "checkinLemonadeTicketPCD", async (span) => {
      tracePipeline(this.definition);

      logger(
        LOG_TAG,
        `got request to check in tickets with request ${JSON.stringify(
          request
        )}`
      );

      let checkerEmail: string;
      let ticketId: string;

      try {
        const payload = await verifyCheckinCredential(request.credential);
        ticketId = payload.ticketIdToCheckIn;
        const checkerEmailPCD = payload.emailPCD;

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

        ticketId = payload.ticketIdToCheckIn;
        span?.setAttribute("ticket_id", ticketId);
        span?.setAttribute("checker_email", checkerEmailPCD.claim.emailAddress);
        span?.setAttribute(
          "checked_semaphore_id",
          checkerEmailPCD.claim.semaphoreId
        );
        checkerEmail = checkerEmailPCD.claim.emailAddress;
      } catch (e) {
        logger(`${LOG_TAG} Failed to verify credential due to error: `, e);
        setError(e, span);
        span?.setAttribute("checkin_error", "InvalidSignature");
        return { checkedIn: false, error: { name: "InvalidSignature" } };
      }

      const ticketAtom = await this.db.loadById(this.id, ticketId);
      if (!ticketAtom) {
        span?.setAttribute("checkin_error", "InvalidTicket");
        return { checkedIn: false, error: { name: "InvalidTicket" } };
      }

      const canCheckInResult = await this.canCheckIn(ticketAtom, checkerEmail);

      if (canCheckInResult === true) {
        if (ticketAtom.checkinDate instanceof Date) {
          span?.setAttribute("precheck_error", "AlreadyCheckedIn");
          return {
            checkedIn: false,
            error: {
              name: "AlreadyCheckedIn",
              checkinTimestamp: ticketAtom.checkinDate.toISOString(),
              checker: LEMONADE_CHECKER
            }
          };
        }

        let pendingCheckin;
        if ((pendingCheckin = this.pendingCheckIns.get(ticketAtom.id))) {
          if (
            pendingCheckin.status === CheckinStatus.Pending ||
            pendingCheckin.status === CheckinStatus.Success
          ) {
            span?.setAttribute("checkin_error", "AlreadyCheckedIn");
            return {
              checkedIn: false,
              error: {
                name: "AlreadyCheckedIn",
                checkinTimestamp: new Date(
                  pendingCheckin.timestamp
                ).toISOString(),
                checker: LEMONADE_CHECKER
              }
            };
          }
        }

        this.pendingCheckIns.set(ticketAtom.id, {
          status: CheckinStatus.Pending,
          timestamp: Date.now()
        });
        try {
          const credentials: LemonadeOAuthCredentials = {
            oauthAudience: this.definition.options.oauthAudience,
            oauthClientId: this.definition.options.oauthClientId,
            oauthClientSecret: this.definition.options.oauthClientSecret,
            oauthServerUrl: this.definition.options.oauthServerUrl
          };

          await this.api.checkinUser(
            this.definition.options.backendUrl,
            credentials,
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
            )} on behalf of checker ${checkerEmail}`
          );
          setError(e, span);
          span?.setAttribute("checkin_error", "ServerError");

          this.pendingCheckIns.delete(ticketAtom.id);

          return { checkedIn: false, error: { name: "ServerError" } };
        }
        return { checkedIn: true };
      } else {
        span?.setAttribute("checkin_error", canCheckInResult.name);
        return { checkedIn: false, error: canCheckInResult };
      }
    });
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
  lemonadeUserId: string;
  checkinDate: Date | null;
}
