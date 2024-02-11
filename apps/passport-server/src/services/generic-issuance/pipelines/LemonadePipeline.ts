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
  PipelineLog,
  PipelineRunInfo,
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
import { v5 as uuidv5 } from "uuid";
import { LemonadeOAuthCredentials } from "../../../apis/lemonade/auth";
import { ILemonadeAPI } from "../../../apis/lemonade/lemonadeAPI";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { logger } from "../../../util/logger";
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
        preCheck: this.checkLemonadeTicketPCDCanBeCheckedIn.bind(this)
      } satisfies CheckinCapability
    ] as unknown as BasePipelineCapability[];
    this.pendingCheckIns = new Map();
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
  public async load(): Promise<PipelineRunInfo> {
    return traced(LOG_NAME, "load", async (span) => {
      const logs: PipelineLog[] = [];
      const startTime = Date.now();

      span?.setAttribute("pipeline_id", this.id);
      span?.setAttribute("pipeline_type", this.type);

      const loadStart = Date.now();

      const credentials = {
        oauthAudience: this.definition.options.oauthAudience,
        oauthClientId: this.definition.options.oauthClientId,
        oauthClientSecret: this.definition.options.oauthClientSecret,
        oauthServerUrl: this.definition.options.oauthServerUrl
      };

      const configuredEventIds = new Set(
        this.definition.options.events.map((ev) => ev.externalId)
      );
      // Fetch events from Lemonade
      const events = (
        await this.api.getHostingEvents(
          this.definition.options.backendUrl,
          credentials
        )
      )
        // Filter out events not in our configuration
        .filter((ev) => configuredEventIds.has(ev._id));

      // For each event, fetch tickets
      const tickets = await Promise.all(
        events.map(async (ev) => {
          const eventConfig = this.definition.options.events.find(
            (e) => e.externalId === ev._id
          );

          // If not, return no tickets
          if (!eventConfig) {
            // This should never happen because we filtered the fetched events
            // earlier
            throw new Error(
              `Failed to get event configuration for ${ev._id} in pipeline ${this.id}`
            );
          }

          // Get tickets for this event
          const eventTickets = await this.api.getTickets(
            this.definition.options.backendUrl,
            credentials,
            ev._id
          );

          // We only want to return tickets which are of a supported type
          // Get the supported types from event configuration
          const configuredTypes = new Set(
            eventConfig.ticketTypes.map((ticketType) => ticketType.externalId)
          );

          return {
            eventConfig,
            // Filter the tickets down to configured ticket types
            tickets: eventTickets.filter((t) => {
              const result = configuredTypes.has(t.type_id);
              if (!result) {
                logger(
                  `${LOG_TAG} Encountered unsupported ticket type ${t.type_title} (${t.type_id}) on ticket ${t._id}, pipeline ${this.id}`
                );
              }
              return result;
            })
          };
        })
      );

      const atomsToSave = tickets.flatMap(
        ({ eventConfig, tickets }): LemonadeAtom[] => {
          return tickets.map(
            (t) =>
              ({
                id: uuidv5(t._id, eventConfig.genericIssuanceEventId),
                email: t.user_email,
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

      return {
        latestLogs: logs,
        lastRunEndTimestamp: Date.now(),
        lastRunStartTimestamp: startTime,
        atomsLoaded: atomsToSave.length,
        success: true
      } satisfies PipelineRunInfo;
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
    return traced(LOG_NAME, "issueLemonadeTicketPCDs", async (span) => {
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

      span?.setAttribute("email", email);
      span?.setAttribute("semaphore_id", emailPCD.claim.semaphoreId);

      // TODO: cache this intelligently
      const tickets = await Promise.all(
        ticketDatas.map((t) =>
          this.ticketDataToTicketPCD(t, this.eddsaPrivateKey)
        )
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
      attendeeEmail: atom.email,
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

    const checkerEventTickets = checkerTickets.filter(
      (t) => t.lemonadeEventId === lemonadeEventId
    );
    const checkerEventTicketTypes = checkerEventTickets.map((t) => {
      const ticketTypeConfig = eventConfig.ticketTypes.find(
        (ticketTypes) => ticketTypes.externalId === t.lemonadeTicketTypeId
      );
      return ticketTypeConfig;
    });
    const hasSuperUserTicket = checkerEventTicketTypes.find(
      (t) => t?.isSuperUser
    );

    if (!hasSuperUserTicket) {
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
        span?.setAttribute("pipeline_id", this.id);
        span?.setAttribute("pipeline_type", this.type);

        let checkerTickets: LemonadeAtom[];
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

          span?.setAttribute("ticket_id", ticketId);
          span?.setAttribute(
            "checker_email",
            checkerEmailPCD.claim.emailAddress
          );
          span?.setAttribute(
            "checked_semaphore_id",
            checkerEmailPCD.claim.semaphoreId
          );
        } catch (e) {
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
          checkerTickets
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
      span?.setAttribute("pipeline_id", this.id);
      span?.setAttribute("pipeline_type", this.type);
      logger(
        LOG_TAG,
        `got request to check in tickets with request ${JSON.stringify(
          request
        )}`
      );

      let checkerTickets: LemonadeAtom[];
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
        span?.setAttribute("ticket_id", ticketId);
        span?.setAttribute("checker_email", checkerEmailPCD.claim.emailAddress);
        span?.setAttribute(
          "checked_semaphore_id",
          checkerEmailPCD.claim.semaphoreId
        );
      } catch (e) {
        setError(e, span);
        span?.setAttribute("checkin_error", "InvalidSignature");
        return { checkedIn: false, error: { name: "InvalidSignature" } };
      }

      const ticketAtom = await this.db.loadById(this.id, ticketId);
      if (!ticketAtom) {
        span?.setAttribute("checkin_error", "InvalidTicket");
        return { checkedIn: false, error: { name: "InvalidTicket" } };
      }

      const canCheckInResult = await this.canCheckIn(
        ticketAtom,
        checkerTickets
      );

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
            )} on behalf of checker ${checkerTickets[0].email}`
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
