/* eslint-disable @typescript-eslint/no-unused-vars */
import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import { EdDSAFrogPCDPackage, IFrogData } from "@pcd/eddsa-frog-pcd";
import {
  EdDSAPublicKey,
  getEdDSAPublicKey,
  isEqualEdDSAPublicKey
} from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { EmailPCD, EmailPCDPackage } from "@pcd/email-pcd";
import { ObjPCDPackage, ObjPCDTypeName } from "@pcd/obj-pcd";
import { getHash } from "@pcd/passport-crypto";
import {
  CheckTicketByIdRequest,
  CheckTicketByIdResult,
  CheckTicketInByIdRequest,
  CheckTicketInByIdResult,
  Credential,
  FeedHost,
  KnownPublicKeyType,
  KnownTicketGroup,
  KnownTicketTypesResult,
  ListFeedsRequest,
  ListFeedsResponseValue,
  ListSingleFeedRequest,
  PollFeedRequest,
  PollFeedResponseValue,
  VerificationError,
  VerifiedCredential,
  VerifyTicketRequest,
  VerifyTicketResult,
  ZUCONNECT_23_DAY_PASS_PRODUCT_ID,
  ZUCONNECT_PRODUCT_ID_MAPPINGS,
  ZUZALU_23_EVENT_ID,
  ZUZALU_23_ORGANIZER_PRODUCT_ID,
  ZUZALU_23_RESIDENT_PRODUCT_ID,
  ZUZALU_23_VISITOR_PRODUCT_ID,
  ZupassFeedIds,
  verifyCredential,
  zupassDefaultSubscriptions
} from "@pcd/passport-interface";
import {
  PCDAction,
  PCDActionType,
  PCDPermissionType,
  joinPath
} from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { RSAImagePCDPackage } from "@pcd/rsa-image-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { RollbarService } from "@pcd/server-shared";
import { ONE_HOUR_MS, getErrorMessage } from "@pcd/util";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import _ from "lodash";
import { LRUCache } from "lru-cache";
import NodeRSA from "node-rsa";
import { Pool } from "postgres-pool";
import urljoin from "url-join";
import {
  DevconnectPretixTicketDBWithEmailAndItem,
  UserRow
} from "../database/models";
import {
  fetchDevconnectPretixTicketByTicketId,
  fetchDevconnectPretixTicketsByEmail,
  fetchDevconnectSuperusersForEmail
} from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import {
  fetchKnownPublicKeys,
  fetchKnownTicketByEventAndProductId,
  fetchKnownTicketTypes,
  setKnownPublicKey,
  setKnownTicketType
} from "../database/queries/knownTicketTypes";
import { upsertUser } from "../database/queries/saveUser";
import {
  fetchUserByAuthKey,
  fetchUserByCommitment
} from "../database/queries/users";
import { fetchZuconnectTicketsByEmail } from "../database/queries/zuconnect/fetchZuconnectTickets";
import { fetchAllUsersWithZuzaluTickets } from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { timeBasedId } from "../util/timeBasedId";
import {
  zuconnectProductIdToEventId,
  zuconnectProductIdToName
} from "../util/zuconnectTicket";
import { zuzaluRoleToProductId } from "../util/zuzaluUser";
import { MultiProcessService } from "./multiProcessService";
import { PersistentCacheService } from "./persistentCacheService";
import { traced } from "./telemetryService";

export const ZUPASS_TICKET_PUBLIC_KEY_NAME = "Zupass";

export class IssuanceService {
  private readonly context: ApplicationContext;
  private readonly cacheService: PersistentCacheService;
  private readonly rollbarService: RollbarService | null;
  private readonly feedHost: FeedHost;
  private readonly eddsaPrivateKey: string;
  private readonly rsaPrivateKey: NodeRSA;
  private readonly exportedRSAPrivateKey: string;
  private readonly exportedRSAPublicKey: string;
  private readonly multiprocessService: MultiProcessService;
  private readonly verificationPromiseCache: LRUCache<
    string,
    Promise<VerifiedCredential>
  >;

  public constructor(
    context: ApplicationContext,
    cacheService: PersistentCacheService,
    multiprocessService: MultiProcessService,
    rollbarService: RollbarService | null,
    rsaPrivateKey: NodeRSA,
    eddsaPrivateKey: string
  ) {
    this.context = context;
    this.cacheService = cacheService;
    this.multiprocessService = multiprocessService;
    this.rollbarService = rollbarService;
    this.rsaPrivateKey = rsaPrivateKey;
    this.exportedRSAPrivateKey = this.rsaPrivateKey.exportKey("private");
    this.exportedRSAPublicKey = this.rsaPrivateKey.exportKey("public");
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.verificationPromiseCache = new LRUCache<
      string,
      Promise<VerifiedCredential>
    >({
      max: 1000
    });

    this.feedHost = new FeedHost(
      [
        {
          handleRequest: async (
            req: PollFeedRequest
          ): Promise<PollFeedResponseValue> => {
            const actions: PCDAction[] = [];

            try {
              if (req.pcd === undefined) {
                throw new Error(`Missing credential`);
              }
              const verifiedCredential = await this.verifyCredential(req.pcd);
              const pcds =
                await this.issueDevconnectPretixTicketPCDs(verifiedCredential);
              const ticketsByEvent = _.groupBy(
                pcds,
                (pcd) => pcd.claim.ticket.eventName
              );

              const devconnectTickets = Object.entries(ticketsByEvent).filter(
                ([eventName]) => eventName !== "SBC SRW"
              );

              actions.push({
                type: PCDActionType.DeleteFolder,
                folder: "Devconnect",
                recursive: true
              });

              actions.push(
                ...(
                  await Promise.all(
                    devconnectTickets.map(async ([eventName, tickets]) => [
                      {
                        type: PCDActionType.ReplaceInFolder,
                        folder: joinPath("Devconnect", eventName),
                        pcds: await Promise.all(
                          tickets.map((pcd) =>
                            EdDSATicketPCDPackage.serialize(pcd)
                          )
                        )
                      }
                    ])
                  )
                ).flat()
              );
            } catch (e) {
              logger(`Error encountered while serving feed:`, e);
              throw e;
            }

            return { actions };
          },
          feed: {
            id: ZupassFeedIds.Devconnect,
            name: "Devconnect Tickets",
            description: "Get your Devconnect tickets here!",
            partialArgs: undefined,
            credentialRequest: {
              signatureType: "sempahore-signature-pcd"
            },
            permissions: [
              {
                folder: "Devconnect",
                type: PCDPermissionType.AppendToFolder
              },
              {
                folder: "Devconnect",
                type: PCDPermissionType.ReplaceInFolder
              },
              {
                folder: "Devconnect",
                type: PCDPermissionType.DeleteFolder
              }
            ]
          }
        },
        {
          handleRequest: async (
            req: PollFeedRequest
          ): Promise<PollFeedResponseValue> => {
            try {
              if (req.pcd === undefined) {
                throw new Error(`Missing credential`);
              }
              await this.verifyCredential(req.pcd);
              return {
                actions: [
                  {
                    pcds: await this.issueFrogPCDs(),
                    folder: "Frogs",
                    type: PCDActionType.AppendToFolder
                  }
                ]
              };
            } catch (e) {
              logger(`Error encountered while serving feed:`, e);
              this.rollbarService?.reportError(e);
            }
            return { actions: [] };
          },
          feed: {
            id: ZupassFeedIds.Frogs,
            name: "Frogs",
            description: "Get your Frogs here!",
            inputPCDType: undefined,
            partialArgs: undefined,
            credentialRequest: {
              signatureType: "sempahore-signature-pcd"
            },
            permissions: [
              {
                folder: "Frogs",
                type: PCDPermissionType.AppendToFolder
              }
            ]
          }
        },
        {
          handleRequest: async (
            req: PollFeedRequest
          ): Promise<PollFeedResponseValue> => {
            const actions: PCDAction[] = [];

            try {
              if (req.pcd === undefined) {
                throw new Error(`Missing credential`);
              }
              const verifiedCredential = await this.verifyCredential(req.pcd);
              const pcds = await this.issueEmailPCDs(verifiedCredential);

              // Clear out the folder
              actions.push({
                type: PCDActionType.DeleteFolder,
                folder: "Email",
                recursive: false
              });

              actions.push({
                type: PCDActionType.ReplaceInFolder,
                folder: "Email",
                pcds: await Promise.all(
                  pcds.map((pcd) => EmailPCDPackage.serialize(pcd))
                )
              });
            } catch (e) {
              logger(`Error encountered while serving feed:`, e);
              this.rollbarService?.reportError(e);
            }

            return { actions };
          },
          feed: zupassDefaultSubscriptions[ZupassFeedIds.Email]
        },
        {
          handleRequest: async (
            req: PollFeedRequest
          ): Promise<PollFeedResponseValue> => {
            const actions: PCDAction[] = [];
            if (req.pcd === undefined) {
              throw new Error(`Missing credential`);
            }
            try {
              const verifiedCredential = await this.verifyCredential(req.pcd);
              const pcds = await this.issueZuzaluTicketPCDs(verifiedCredential);

              // Clear out the folder
              actions.push({
                type: PCDActionType.DeleteFolder,
                folder: "Zuzalu '23",
                recursive: false
              });

              actions.push({
                type: PCDActionType.ReplaceInFolder,
                folder: "Zuzalu '23",
                pcds: await Promise.all(
                  pcds.map((pcd) => EdDSATicketPCDPackage.serialize(pcd))
                )
              });
            } catch (e) {
              logger(`Error encountered while serving feed:`, e);
              this.rollbarService?.reportError(e);
            }

            return { actions };
          },
          feed: zupassDefaultSubscriptions[ZupassFeedIds.Zuzalu_23]
        },
        {
          handleRequest: async (
            req: PollFeedRequest
          ): Promise<PollFeedResponseValue> => {
            const actions: PCDAction[] = [];
            if (req.pcd === undefined) {
              throw new Error(`Missing credential`);
            }
            try {
              const verifiedCredential = await this.verifyCredential(req.pcd);
              const pcds =
                await this.issueZuconnectTicketPCDs(verifiedCredential);

              // Clear out the old folder
              actions.push({
                type: PCDActionType.DeleteFolder,
                folder: "Zuconnect",
                recursive: false
              });

              // Clear out the folder
              actions.push({
                type: PCDActionType.DeleteFolder,
                folder: "ZuConnect",
                recursive: false
              });

              actions.push({
                type: PCDActionType.ReplaceInFolder,
                folder: "ZuConnect",
                pcds: await Promise.all(
                  pcds.map((pcd) => EdDSATicketPCDPackage.serialize(pcd))
                )
              });
            } catch (e) {
              logger(`Error encountered while serving feed:`, e);
              this.rollbarService?.reportError(e);
            }

            return { actions };
          },
          feed: zupassDefaultSubscriptions[ZupassFeedIds.Zuconnect_23]
        }
      ],
      `${process.env.PASSPORT_SERVER_URL}/feeds`,
      "Zupass"
    );
  }

  public async handleListFeedsRequest(
    request: ListFeedsRequest
  ): Promise<ListFeedsResponseValue> {
    return this.feedHost.handleListFeedsRequest(request);
  }

  public async handleListSingleFeedRequest(
    request: ListSingleFeedRequest
  ): Promise<ListFeedsResponseValue> {
    return this.feedHost.handleListSingleFeedRequest(request);
  }

  public async handleFeedRequest(
    request: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return this.feedHost.handleFeedRequest(request);
  }

  public hasFeedWithId(feedId: string): boolean {
    return this.feedHost.hasFeedWithId(feedId);
  }

  public getRSAPublicKey(): string {
    return this.exportedRSAPublicKey;
  }

  public getEdDSAPublicKey(): Promise<EdDSAPublicKey> {
    return getEdDSAPublicKey(this.eddsaPrivateKey);
  }

  public async handleDevconnectCheckInByIdRequest(
    request: CheckTicketInByIdRequest
  ): Promise<CheckTicketInByIdResult> {
    try {
      const ticketDB = await fetchDevconnectPretixTicketByTicketId(
        this.context.dbPool,
        request.ticketId
      );

      const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
        request.checkerProof.pcd
      );

      const check = await this.checkDevconnectTicketById(
        request.ticketId,
        signaturePCD
      );
      if (check.success === false) {
        return check;
      }

      const ticketData = {
        ticketId: request.ticketId,
        eventId: ticketDB?.pretix_events_config_id
      };

      // We know this will succeed as it's also called by
      // checkDevconnectTicketById() above
      const checker = (await fetchUserByCommitment(
        this.context.dbPool,
        signaturePCD.claim.identityCommitment
      )) as UserRow;

      // const successfullyConsumed = await consumeDevconnectPretixTicket(
      //   this.context.dbPool,
      //   ticketData.ticketId ?? "",
      //   checker.email
      // );

      // if (successfullyConsumed) {
      //   return {
      //     value: undefined,
      //     success: true
      //   };
      // }

      return {
        error: {
          name: "ServerError",
          detailedMessage:
            "The server encountered an error. Please try again later."
        },
        success: false
      };
    } catch (e) {
      logger("Error when consuming devconnect ticket", { error: e });
      throw new PCDHTTPError(500, "failed to check in", { cause: e });
    }
  }

  /**
   * Checks that a ticket is valid for Devconnect check-in based on the ticket
   * data in the DB.
   */
  public async handleDevconnectCheckTicketByIdRequest(
    request: CheckTicketByIdRequest
  ): Promise<CheckTicketByIdResult> {
    try {
      const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
        request.signature.pcd
      );
      return this.checkDevconnectTicketById(request.ticketId, signaturePCD);
    } catch (e) {
      return {
        error: { name: "ServerError" },
        success: false
      };
    }
  }

  /**
   * Checks a ticket for validity based on the ticket's status in the DB.
   */
  public async checkDevconnectTicketById(
    ticketId: string,
    signature: SemaphoreSignaturePCD
  ): Promise<CheckTicketByIdResult> {
    try {
      const ticketInDb = await fetchDevconnectPretixTicketByTicketId(
        this.context.dbPool,
        ticketId
      );

      if (!ticketInDb) {
        return {
          error: {
            name: "InvalidTicket",
            detailedMessage: "The ticket you tried to check in is not valid."
          },
          success: false
        };
      }

      let checker;
      try {
        const verifiedCredential = await this.verifyCredential(
          await SemaphoreSignaturePCDPackage.serialize(signature)
        );
        checker = await this.checkUserExists(verifiedCredential);
        if (!checker) {
          throw new Error();
        }
      } catch (e) {
        return {
          error: {
            name: "NotSuperuser",
            detailedMessage:
              "You do not have permission to check this ticket in. Please check with the event host."
          },

          success: false
        };
      }

      const checkerSuperUserPermissions =
        await fetchDevconnectSuperusersForEmail(
          this.context.dbPool,
          "checker.email"
        );

      const relevantSuperUserPermission = checkerSuperUserPermissions.find(
        (perm) =>
          perm.pretix_events_config_id === ticketInDb.pretix_events_config_id
      );

      if (!relevantSuperUserPermission) {
        return {
          error: {
            name: "NotSuperuser",
            detailedMessage:
              "You do not have permission to check this ticket in. Please check with the event host."
          },
          success: false
        };
      }

      if (ticketInDb.is_deleted) {
        return {
          error: {
            name: "TicketRevoked",
            revokedTimestamp: Date.now(),
            detailedMessage:
              "The ticket has been revoked. Please check with the event host."
          },
          success: false
        };
      }

      if (ticketInDb.is_consumed) {
        return {
          error: {
            name: "AlreadyCheckedIn",
            checker: ticketInDb.checker ?? undefined,
            checkinTimestamp: (
              ticketInDb.zupass_checkin_timestamp ?? new Date()
            ).toISOString()
          },
          success: false
        };
      }

      return {
        value: {
          eventName: ticketInDb.event_name,
          attendeeEmail: ticketInDb.email,
          attendeeName: ticketInDb.full_name,
          ticketName: ticketInDb.item_name
        },
        success: true
      };
    } catch (e) {
      logger("Error when checking ticket", { error: e });
      return {
        error: { name: "ServerError", detailedMessage: getErrorMessage(e) },
        success: false
      };
    }
  }

  /**
   * Verifies credentials for feeds and check-in. Provides a simple caching
   * layer over {@link verifyCredential}.
   */
  public async verifyCredential(
    credential: Credential
  ): Promise<VerifiedCredential> {
    const key = JSON.stringify(credential);
    const cached = this.verificationPromiseCache.get(key);
    const span = getActiveSpan();
    span?.setAttribute("credential_verification_cache_hit", !!cached);
    if (cached) {
      return cached;
    } else {
      if (credential.type === ObjPCDTypeName) {
        const pcd = await ObjPCDPackage.deserialize(credential.pcd);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authKey = (pcd.proof.obj as any)["authKey"];
        if (!authKey) {
          throw new Error("auth key pcd missing authKey entry");
        }
        const user = await fetchUserByAuthKey(this.context.dbPool, authKey);
        if (!user) {
          throw new PCDHTTPError(401, `no user for auth key ${authKey} found`);
        }

        return {
          email: "user.email".toLowerCase(),
          semaphoreId: user.commitment,
          authKey
        } satisfies VerifiedCredential;
      }

      const promise = verifyCredential(credential).catch((err) => {
        // If we received an unexpected kind of exception, remove the promise
        // from the cache. Instances of VerificationError indicate that the
        // credential failed to verify, so we want to keep those in the cache
        // to avoid re-verifying a failed credential.
        if (!(err instanceof VerificationError)) {
          this.verificationPromiseCache.delete(key);
        }
        throw err;
      });
      this.verificationPromiseCache.set(key, promise);
      return promise;
    }
  }

  private async checkUserExists({
    semaphoreId
  }: VerifiedCredential): Promise<UserRow | null> {
    const user = await fetchUserByCommitment(this.context.dbPool, semaphoreId);

    if (user === null) {
      logger(
        `can't issue PCDs for ${semaphoreId} because ` +
          `we don't have a user with that commitment in the database`
      );
      return null;
    }

    return user;
  }

  /**
   * Fetch all DevconnectPretixTicket entities under a given user's email.
   */
  private async issueDevconnectPretixTicketPCDs(
    credential: VerifiedCredential
  ): Promise<EdDSATicketPCD[]> {
    return traced(
      "IssuanceService",
      "issueDevconnectPretixTicketPCDs",
      async (span) => {
        const commitmentRow = await this.checkUserExists(credential);
        const email = commitmentRow?.emails?.[0];
        if (commitmentRow) {
          span?.setAttribute(
            "commitment",
            commitmentRow?.commitment?.toString() ?? ""
          );
        }
        if (email) {
          span?.setAttribute("email", email);
        }

        if (!commitmentRow || !email) {
          return [];
        }

        if (this.ticketIssuanceDisabled()) {
          if (commitmentRow.extra_issuance) {
            commitmentRow.extra_issuance = false;
            await upsertUser(this.context.dbPool, commitmentRow);
          } else {
            throw new PCDHTTPError(
              410,
              `Issuance of Devconnect tickets was turned off on ${this.getTicketIssuanceCutoffDate()?.toDateString()}.` +
                ` Contact support@0xparc.org if you've lost access to your tickets.`
            );
          }
        }

        const commitmentId = commitmentRow.commitment.toString();
        const ticketsDB = await fetchDevconnectPretixTicketsByEmail(
          this.context.dbPool,
          email
        );

        const tickets = await Promise.all(
          ticketsDB
            .map((t) => IssuanceService.ticketRowToTicketData(t, commitmentId))
            .map((ticketData) => this.getOrGenerateTicket(ticketData))
        );

        span?.setAttribute("ticket_count", tickets.length);

        return tickets;
      }
    );
  }

  private getTicketIssuanceCutoffDate(): Date | null {
    const cutoffDate = process.env.TICKET_ISSUANCE_CUTOFF_DATE;

    if (cutoffDate !== undefined) {
      const cutoffDateTimestamp = Date.parse(cutoffDate);
      if (isNaN(cutoffDateTimestamp)) {
        return null;
      }
      return new Date(cutoffDateTimestamp);
    }

    return null;
  }

  private ticketIssuanceDisabled(): boolean {
    const cutoffDate = this.getTicketIssuanceCutoffDate();

    if (cutoffDate === null) {
      return false;
    }

    return Date.now() > cutoffDate.getTime();
  }

  private async getOrGenerateTicket(
    ticketData: ITicketData
  ): Promise<EdDSATicketPCD> {
    return traced("IssuanceService", "getOrGenerateTicket", async (span) => {
      span?.setAttribute("ticket_id", ticketData.ticketId);
      span?.setAttribute("ticket_email", ticketData.attendeeEmail);
      span?.setAttribute("ticket_name", ticketData.attendeeName);

      const cachedTicket = await this.getCachedTicket(ticketData);

      if (cachedTicket) {
        return cachedTicket;
      }

      logger(`[ISSUANCE] cache miss for ticket id ${ticketData.ticketId}`);

      const generatedTicket = await IssuanceService.ticketDataToTicketPCD(
        ticketData,
        this.eddsaPrivateKey
      );

      try {
        this.cacheTicket(generatedTicket);
      } catch (e) {
        this.rollbarService?.reportError(e);
        logger(
          `[ISSUANCE] error caching ticket ${ticketData.ticketId} ` +
            `${ticketData.attendeeEmail} for ${ticketData.eventId} (${ticketData.eventName})`
        );
      }

      return generatedTicket;
    });
  }

  private static async getTicketCacheKey(
    ticketData: ITicketData
  ): Promise<string> {
    const ticketCopy: Partial<ITicketData> = { ...ticketData };
    // the reason we remove `timestampSigned` from the cache key
    // is that it changes every time we instantiate `ITicketData`
    // for a particular devconnect ticket, rendering the caching
    // ineffective.
    delete ticketCopy.timestampSigned;
    const hash = await getHash(JSON.stringify(ticketCopy));
    return hash;
  }

  private async cacheTicket(ticket: EdDSATicketPCD): Promise<void> {
    const key = await IssuanceService.getTicketCacheKey(ticket.claim.ticket);
    const serialized = await EdDSATicketPCDPackage.serialize(ticket);
    this.cacheService.setValue(key, JSON.stringify(serialized));
  }

  private async getCachedTicket(
    ticketData: ITicketData
  ): Promise<EdDSATicketPCD | undefined> {
    const key = await IssuanceService.getTicketCacheKey(ticketData);
    const serializedTicket = await this.cacheService.getValue(key);
    if (!serializedTicket) {
      logger(`[ISSUANCE] cache miss for ticket id ${ticketData.ticketId}`);
      return undefined;
    }
    logger(`[ISSUANCE] cache hit for ticket id ${ticketData.ticketId}`);
    const parsedTicket = JSON.parse(serializedTicket.cache_value);

    try {
      const deserializedTicket = await EdDSATicketPCDPackage.deserialize(
        parsedTicket.pcd
      );
      return deserializedTicket;
    } catch (e) {
      logger("[ISSUANCE]", `failed to parse cached ticket ${key}`, e);
      this.rollbarService?.reportError(e);
      return undefined;
    }
  }

  private static async ticketDataToTicketPCD(
    ticketData: ITicketData,
    eddsaPrivateKey: string
  ): Promise<EdDSATicketPCD> {
    const stableId = await getHash("issued-ticket-" + ticketData.attendeeEmail);

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

  private static ticketRowToTicketData(
    t: DevconnectPretixTicketDBWithEmailAndItem,
    semaphoreId: string
  ): ITicketData {
    return {
      // unsigned fields
      attendeeName: t.full_name,
      attendeeEmail: t.email,
      eventName: t.event_name,
      ticketName: t.item_name,
      checkerEmail: t.checker ?? undefined,

      // signed fields
      ticketId: t.id,
      eventId: t.pretix_events_config_id,
      productId: t.devconnect_pretix_items_info_id,
      timestampConsumed:
        t.zupass_checkin_timestamp === null
          ? 0
          : new Date(t.zupass_checkin_timestamp).getTime(),
      timestampSigned: Date.now(),
      attendeeSemaphoreId: semaphoreId,
      isConsumed: t.is_consumed,
      isRevoked: t.is_deleted,
      ticketCategory: TicketCategory.Devconnect
    } satisfies ITicketData;
  }

  private async issueFrogPCDs(): Promise<SerializedPCD[]> {
    const FROG_INTERVAL_MS = 1000 * 60 * 60 * 24; // one new frog every 24h
    // Images are served from passport-client's web host
    const imageServerUrl = process.env.PASSPORT_CLIENT_URL;

    if (!imageServerUrl) {
      logger(
        "[ISSUE] can't issue frogs - unaware of the image server location"
      );
      return [];
    }

    const frogPaths: string[] = [
      "images/frogs/frog.jpeg",
      "images/frogs/frog2.jpeg",
      "images/frogs/frog3.jpeg",
      "images/frogs/frog4.jpeg"
    ];

    const randomFrogPath = _.sample(frogPaths);

    const id = timeBasedId(FROG_INTERVAL_MS) + "";

    const frogPCD = await RSAImagePCDPackage.serialize(
      await RSAImagePCDPackage.prove({
        privateKey: {
          argumentType: ArgumentTypeName.String,
          value: this.exportedRSAPrivateKey
        },
        url: {
          argumentType: ArgumentTypeName.String,
          value: imageServerUrl + "/" + randomFrogPath
        },
        title: {
          argumentType: ArgumentTypeName.String,
          value: "frog " + id
        },
        id: {
          argumentType: ArgumentTypeName.String,
          value: id
        }
      })
    );

    return [frogPCD];
  }

  /**
   * Issue an EdDSAFrogPCD from IFrogData signed with IssuanceService's private key.
   */
  public async issueEdDSAFrogPCDs(
    credential: Credential,
    frogData: IFrogData
  ): Promise<SerializedPCD[]> {
    const frogPCD = await EdDSAFrogPCDPackage.serialize(
      await EdDSAFrogPCDPackage.prove({
        privateKey: {
          argumentType: ArgumentTypeName.String,
          // NOTE: Incorrect key. Should be eddsaPrivateKey.
          // We correct for this later on by deriving the eddsa public key from the rsa public key.
          // Due to the fact that RSA is 1024 bit and EdDSA is 256 bits, the RSA gets modded by 256
          // and we have a deterministicly generated EdDSA key
          value: this.exportedRSAPrivateKey
        },
        data: {
          argumentType: ArgumentTypeName.Object,
          value: frogData
        },
        id: {
          argumentType: ArgumentTypeName.String
        }
      })
    );

    return [frogPCD];
  }

  /**
   * Issues email PCDs based on the user's verified email address.
   * Currently we only verify a single email address, but could provide
   * multiple PCDs if it were possible to verify secondary emails.
   */
  private async issueEmailPCDs(
    credential: VerifiedCredential
  ): Promise<EmailPCD[]> {
    return traced("IssuanceService", "issueEmailPCDs", async (span) => {
      const user = await this.checkUserExists(credential);

      if (!user) {
        return [];
      }

      span?.setAttribute("commitment", user?.commitment?.toString() ?? "");

      if (user) {
        span?.setAttribute("emails", user.emails);
      }

      return Promise.all(
        user.emails.map((email) => {
          const stableId = "attested-email-" + email;
          return EmailPCDPackage.prove({
            privateKey: {
              value: this.eddsaPrivateKey,
              argumentType: ArgumentTypeName.String
            },
            id: {
              value: stableId,
              argumentType: ArgumentTypeName.String
            },
            emailAddress: {
              value: email,
              argumentType: ArgumentTypeName.String
            },
            semaphoreId: {
              value: user.commitment,
              argumentType: ArgumentTypeName.String
            }
          });
        })
      );
    });
  }

  private async issueZuzaluTicketPCDs(
    credential: VerifiedCredential
  ): Promise<EdDSATicketPCD[]> {
    return traced("IssuanceService", "issueZuzaluTicketPCDs", async (span) => {
      // The image we use for Zuzalu tickets is served from the same place
      // as passport-client.
      // This is the same mechanism as used in frog image PCDs.
      const imageServerUrl = process.env.PASSPORT_CLIENT_URL;

      if (!imageServerUrl) {
        logger(
          "[ISSUE] can't issue Zuzalu tickets - unaware of the image server location"
        );
        return [];
      }

      const user = await this.checkUserExists(credential);
      const email = user?.emails?.[0];
      if (user) {
        span?.setAttribute("commitment", user?.commitment?.toString() ?? "");
      }
      if (email) {
        span?.setAttribute("email", email);
      }

      if (!user || !email) {
        return [];
      }

      const allUsersAndTickets = await fetchAllUsersWithZuzaluTickets(
        this.context.dbPool
      );
      const zuzaluTickets = allUsersAndTickets.find((u) => u.uuid === user.uuid)
        ?.zuzaluTickets;
      if (!zuzaluTickets) {
        return [];
      }

      const tickets = [];

      for (const ticket of zuzaluTickets) {
        tickets.push(
          await this.getOrGenerateTicket({
            attendeeSemaphoreId: user.commitment,
            eventName: "Zuzalu (March - May 2023)",
            checkerEmail: undefined,
            ticketId: user.uuid,
            ticketName: ticket.role.toString(),
            attendeeName: ticket.name,
            attendeeEmail: ticket.email,
            eventId: ZUZALU_23_EVENT_ID,
            productId: zuzaluRoleToProductId(ticket.role),
            timestampSigned: Date.now(),
            timestampConsumed: 0,
            isConsumed: false,
            isRevoked: false,
            ticketCategory: TicketCategory.Zuzalu,
            imageUrl: urljoin(imageServerUrl, "images/zuzalu", "zuzalu.png"),
            imageAltText: "Zuzalu logo"
          })
        );
      }

      return tickets;
    });
  }

  /**
   * Issues EdDSATicketPCD tickets to Zuconnect ticket holders.
   * It is technically possible for a user to have more than one ticket, e.g.
   * a day pass ticket-holder might upgrade to a full ticket.
   */
  private async issueZuconnectTicketPCDs(
    credential: VerifiedCredential
  ): Promise<EdDSATicketPCD[]> {
    return traced(
      "IssuanceService",
      "issueZuconnectTicketPCDs",
      async (span) => {
        const imageServerUrl = process.env.PASSPORT_CLIENT_URL;

        if (!imageServerUrl) {
          logger(
            "[ISSUE] can't issue ZuConnect tickets - unaware of the image server location"
          );
          return [];
        }
        const user = await this.checkUserExists(credential);
        const email = "user?.email";
        if (user) {
          span?.setAttribute("commitment", user?.commitment?.toString() ?? "");
        }
        if (email) {
          span?.setAttribute("email", email);
        }

        if (!user || !email) {
          return [];
        }

        const tickets = await fetchZuconnectTicketsByEmail(
          this.context.dbPool,
          email
        );

        const pcds = [];

        for (const ticket of tickets) {
          const ticketName =
            ticket.product_id === ZUCONNECT_23_DAY_PASS_PRODUCT_ID
              ? ticket.extra_info.join("\n")
              : zuconnectProductIdToName(ticket.product_id);
          pcds.push(
            await this.getOrGenerateTicket({
              attendeeSemaphoreId: user.commitment,
              eventName: "Zuconnect October-November '23",
              checkerEmail: undefined,
              ticketId: ticket.id,
              ticketName,
              attendeeName: `${ticket.attendee_name}`,
              attendeeEmail: ticket.attendee_email,
              eventId: zuconnectProductIdToEventId(ticket.product_id),
              productId: ticket.product_id,
              timestampSigned: Date.now(),
              timestampConsumed: 0,
              isConsumed: false,
              isRevoked: false,
              ticketCategory: TicketCategory.ZuConnect,
              imageUrl: urljoin(
                imageServerUrl,
                "images/zuzalu",
                "zuconnect.png"
              ),
              imageAltText: "ZuConnect"
            })
          );
        }

        return pcds;
      }
    );
  }

  /**
   * Verifies a ticket based on:
   * 1) verification of the PCD (that it is correctly formed, with a proof
   *    matching the claim)
   * 2) whether the ticket matches the ticket types known to us, e.g. Zuzalu
   *    or Zuconnect tickets
   *
   * Not used for Devconnect tickets, which have a separate check-in flow.
   * This is the default verification flow for ticket PCDs, based on the
   * standard QR code, but only Zuconnect/Zuzalu '23 tickets will be returned
   * as verified.
   */
  private async verifyKnownTicket(
    serializedPCD: SerializedPCD
  ): Promise<VerifyTicketResult> {
    if (!serializedPCD.type) {
      throw new Error("input was not a serialized PCD");
    }

    if (
      serializedPCD.type !== EdDSATicketPCDPackage.name &&
      serializedPCD.type !== ZKEdDSAEventTicketPCDPackage.name
    ) {
      throw new Error(
        `serialized PCD was wrong type, '${serializedPCD.type}' instead of '${EdDSATicketPCDPackage.name}' or '${ZKEdDSAEventTicketPCDPackage.name}'`
      );
    }

    let eventId: string;
    let productId: string;
    let publicKey: EdDSAPublicKey;

    if (serializedPCD.type === EdDSATicketPCDPackage.name) {
      const pcd = await EdDSATicketPCDPackage.deserialize(serializedPCD.pcd);

      if (!EdDSATicketPCDPackage.verify(pcd)) {
        return {
          success: true,
          value: { verified: false, message: "Could not verify PCD." }
        };
      }

      eventId = pcd.claim.ticket.eventId;
      productId = pcd.claim.ticket.productId;
      publicKey = pcd.proof.eddsaPCD.claim.publicKey;
    } else {
      const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
        serializedPCD.pcd
      );

      if (!ZKEdDSAEventTicketPCDPackage.verify(pcd)) {
        return {
          success: true,
          value: { verified: false, message: "Could not verify PCD." }
        };
      }

      if (
        !(pcd.claim.partialTicket.eventId && pcd.claim.partialTicket.productId)
      ) {
        return {
          success: true,
          value: {
            verified: false,
            message: "PCD does not reveal the correct fields."
          }
        };
      }

      // Watermarks can be up to four hours old
      if (Date.now() - parseInt(pcd.claim.watermark) > ONE_HOUR_MS * 4) {
        return {
          success: true,
          value: {
            verified: false,
            message: "PCD watermark has expired."
          }
        };
      }

      eventId = pcd.claim.partialTicket.eventId;
      productId = pcd.claim.partialTicket.productId;
      publicKey = pcd.claim.signer;
    }

    const knownTicketType = await fetchKnownTicketByEventAndProductId(
      this.context.dbPool,
      eventId,
      productId
    );

    // If we found a known ticket type, compare public keys
    if (
      knownTicketType &&
      isEqualEdDSAPublicKey(JSON.parse(knownTicketType.public_key), publicKey)
    ) {
      // We can say that the submitted ticket can be verified as belonging
      // to a known group
      return {
        success: true,
        value: {
          verified: true,
          publicKeyName: knownTicketType.known_public_key_name,
          group: knownTicketType.ticket_group,
          eventName: knownTicketType.event_name
        }
      };
    } else {
      return {
        success: true,
        value: {
          verified: false,
          message: "Not a recognized ticket"
        }
      };
    }
  }

  public async handleVerifyTicketRequest(
    req: VerifyTicketRequest
  ): Promise<VerifyTicketResult> {
    const pcdStr = req.pcd;
    try {
      return this.verifyKnownTicket(JSON.parse(pcdStr));
    } catch (e) {
      throw new PCDHTTPError(500, "The ticket could not be verified", {
        cause: e
      });
    }
  }

  /**
   * Returns information about the known public keys, and known ticket types.
   * This is used by clients to perform basic checks of validity against
   * ticket PCDs, based on the public key and ticket/event IDs.
   */
  public async handleKnownTicketTypesRequest(): Promise<KnownTicketTypesResult> {
    const knownTickets = await fetchKnownTicketTypes(this.context.dbPool);
    const knownPublicKeys = await fetchKnownPublicKeys(this.context.dbPool);
    return {
      success: true,
      value: {
        publicKeys: knownPublicKeys.map((pk) => {
          return {
            publicKey:
              pk.public_key_type === "eddsa"
                ? JSON.parse(pk.public_key)
                : pk.public_key,
            publicKeyName: pk.public_key_name,
            publicKeyType: pk.public_key_type
          };
        }),
        knownTicketTypes: knownTickets.map((tt) => {
          return {
            eventId: tt.event_id,
            productId: tt.product_id,
            publicKey:
              tt.known_public_key_type === "eddsa"
                ? JSON.parse(tt.public_key)
                : tt.public_key,
            publicKeyName: tt.known_public_key_name,
            publicKeyType: tt.known_public_key_type,
            ticketGroup: tt.ticket_group
          };
        })
      }
    };
  }
}

export async function startIssuanceService(
  context: ApplicationContext,
  cacheService: PersistentCacheService,
  rollbarService: RollbarService | null,
  multiprocessService: MultiProcessService
): Promise<IssuanceService | null> {
  const zupassRsaKey = loadRSAPrivateKey();
  const zupassEddsaKey = loadEdDSAPrivateKey();

  if (zupassRsaKey === null || zupassEddsaKey === null) {
    logger("[INIT] can't start issuance service, missing private key");
    return null;
  }

  await setupKnownTicketTypes(
    context.dbPool,
    await getEdDSAPublicKey(zupassEddsaKey)
  );

  const issuanceService = new IssuanceService(
    context,
    cacheService,
    multiprocessService,
    rollbarService,
    zupassRsaKey,
    zupassEddsaKey
  );

  return issuanceService;
}

/**
 * The issuance service relies on a list of known ticket types, and their
 * associated public keys. This relies on having these stored in the database,
 * and we can ensure that certain known public keys and tickets are stored by
 * inserting them here.
 *
 * This works because we know the key we're using to issue tickets, and we
 * have some hard-coded IDs for Zuzalu '23 tickets.
 *
 * See {@link verifyTicket} and {@link handleKnownTicketTypesRequest} for
 * usage of this data.
 *
 * See also {@link setDevconnectTicketTypes} in the Devconnect sync service.
 */
async function setupKnownTicketTypes(
  db: Pool,
  eddsaPubKey: EdDSAPublicKey
): Promise<void> {
  await setKnownPublicKey(
    db,
    ZUPASS_TICKET_PUBLIC_KEY_NAME,
    KnownPublicKeyType.EdDSA,
    JSON.stringify(eddsaPubKey)
  );

  await setKnownTicketType(
    db,
    "ZUZALU23_VISITOR",
    ZUZALU_23_EVENT_ID,
    ZUZALU_23_VISITOR_PRODUCT_ID,
    ZUPASS_TICKET_PUBLIC_KEY_NAME,
    KnownPublicKeyType.EdDSA,
    KnownTicketGroup.Zuzalu23,
    "Zuzalu '23"
  );

  await setKnownTicketType(
    db,
    "ZUZALU23_RESIDENT",
    ZUZALU_23_EVENT_ID,
    ZUZALU_23_RESIDENT_PRODUCT_ID,
    ZUPASS_TICKET_PUBLIC_KEY_NAME,
    KnownPublicKeyType.EdDSA,
    KnownTicketGroup.Zuzalu23,
    "Zuzalu '23"
  );

  await setKnownTicketType(
    db,
    "ZUZALU23_ORGANIZER",
    ZUZALU_23_EVENT_ID,
    ZUZALU_23_ORGANIZER_PRODUCT_ID,
    ZUPASS_TICKET_PUBLIC_KEY_NAME,
    KnownPublicKeyType.EdDSA,
    KnownTicketGroup.Zuzalu23,
    "Zuzalu '23"
  );

  // Store Zuconnect ticket types
  for (const { id, eventId } of Object.values(ZUCONNECT_PRODUCT_ID_MAPPINGS)) {
    setKnownTicketType(
      db,
      `zuconnect-${id}`,
      eventId,
      id,
      ZUPASS_TICKET_PUBLIC_KEY_NAME,
      KnownPublicKeyType.EdDSA,
      KnownTicketGroup.Zuconnect23,
      "ZuConnect '23"
    );
  }
}

export function loadRSAPrivateKey(): NodeRSA | null {
  const pkeyEnv = process.env.SERVER_RSA_PRIVATE_KEY_BASE64;

  if (!pkeyEnv) {
    logger("[INIT] missing environment variable SERVER_RSA_PRIVATE_KEY_BASE64");
    return null;
  }

  try {
    const key = new NodeRSA(
      Buffer.from(pkeyEnv, "base64").toString("utf-8"),
      "private"
    );
    return key;
  } catch (e) {
    logger("failed to parse RSA private key", e);
  }

  return null;
}

export function loadEdDSAPrivateKey(): string | null {
  const pkeyEnv = process.env.SERVER_EDDSA_PRIVATE_KEY;

  if (!pkeyEnv) {
    logger("[INIT] missing environment variable SERVER_EDDSA_PRIVATE_KEY");
    return null;
  }

  return pkeyEnv;
}
