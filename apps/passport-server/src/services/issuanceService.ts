import { EDdSAPublicKey, getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  getEdDSATicketData,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { EmailPCD, EmailPCDPackage } from "@pcd/email-pcd";
import { getHash } from "@pcd/passport-crypto";
import {
  CheckTicketInRequest,
  CheckTicketInResult,
  CheckTicketRequest,
  CheckTicketResult,
  FeedHost,
  ISSUANCE_STRING,
  ListFeedsRequest,
  ListFeedsResponseValue,
  ListSingleFeedRequest,
  PCDPassFeedIds,
  PollFeedRequest,
  PollFeedResponseValue,
  ZuzaluUserRole
} from "@pcd/passport-interface";
import {
  AppendToFolderAction,
  AppendToFolderPermission,
  joinPath,
  PCDAction,
  PCDActionType,
  PCDPermissionType,
  ReplaceInFolderAction,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { RSAImagePCDPackage } from "@pcd/rsa-image-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage,
  SemaphoreSignaturePCDTypeName
} from "@pcd/semaphore-signature-pcd";
import { getErrorMessage } from "@pcd/util";
import _ from "lodash";
import NodeRSA from "node-rsa";
import {
  CommitmentRow,
  DevconnectPretixTicketDBWithEmailAndItem
} from "../database/models";
import { fetchCommitmentByPublicCommitment } from "../database/queries/commitments";
import {
  fetchDevconnectPretixTicketByTicketId,
  fetchDevconnectPretixTicketsByEmail,
  fetchDevconnectSuperusersForEmail
} from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { consumeDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import { fetchLoggedInZuzaluUser } from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { timeBasedId } from "../util/timeBasedId";
import { PersistentCacheService } from "./persistentCacheService";
import { RollbarService } from "./rollbarService";
import { traced } from "./telemetryService";

// Since Zuzalu did not have event or product UUIDs at the time, we can
// allocate some constant ones now.
export const ZUZALU_RESIDENT_EVENT_ID = "5ba4cd9e-893c-4a4a-b15b-cf36ceda1938";
export const ZUZALU_VISITOR_EVENT_ID = "53b518ed-e427-4a23-bf36-a6e1e2764256";
export const ZUZALU_ORGANIZER_EVENT_ID = "10016d35-40df-4033-a171-7d661ebaccaa";
export const ZUZALU_PRODUCT_ID = "5de90d09-22db-40ca-b3ae-d934573def8b";

export class IssuanceService {
  private readonly context: ApplicationContext;
  private readonly cacheService: PersistentCacheService;
  private readonly rollbarService: RollbarService | null;
  private readonly feedHost: FeedHost;
  private readonly eddsaPrivateKey: string;
  private readonly rsaPrivateKey: NodeRSA;
  private readonly exportedRSAPrivateKey: string;
  private readonly exportedRSAPublicKey: string;

  public constructor(
    context: ApplicationContext,
    cacheService: PersistentCacheService,
    rollbarService: RollbarService | null,
    rsaPrivateKey: NodeRSA,
    eddsaPrivateKey: string
  ) {
    this.context = context;
    this.cacheService = cacheService;
    this.rollbarService = rollbarService;
    this.rsaPrivateKey = rsaPrivateKey;
    this.exportedRSAPrivateKey = this.rsaPrivateKey.exportKey("private");
    this.exportedRSAPublicKey = this.rsaPrivateKey.exportKey("public");
    this.eddsaPrivateKey = eddsaPrivateKey;
    const FEED_PROVIDER_NAME = "PCDPass";

    this.feedHost = new FeedHost(
      [
        {
          handleRequest: async (
            req: PollFeedRequest<typeof SemaphoreSignaturePCDPackage>
          ): Promise<PollFeedResponseValue> => {
            const pcds = await this.issueDevconnectPretixTicketPCDs(
              req.pcd as SerializedPCD<SemaphoreSignaturePCD>
            );
            const ticketsByEvent = _.groupBy(
              pcds,
              (pcd) => pcd.claim.ticket.eventName
            );

            const devconnectTickets = Object.entries(ticketsByEvent).filter(
              ([eventName]) => eventName !== "SBC SRW"
            );

            const srwTickets = Object.entries(ticketsByEvent).filter(
              ([eventName]) => eventName === "SBC SRW"
            );

            const actions = [];

            actions.push({
              type: PCDActionType.ReplaceInFolder,
              folder: "SBC SRW",
              pcds: []
            });

            actions.push({
              type: PCDActionType.ReplaceInFolder,
              folder: "Devconnect",
              pcds: []
            });

            actions.push(
              ...(await Promise.all(
                devconnectTickets.map(async ([eventName, tickets]) => ({
                  type: PCDActionType.ReplaceInFolder,
                  folder: joinPath("Devconnect", eventName),
                  pcds: await Promise.all(
                    tickets.map((pcd) => EdDSATicketPCDPackage.serialize(pcd))
                  )
                }))
              ))
            );

            actions.push(
              ...(await Promise.all(
                srwTickets.map(async ([_, tickets]) => ({
                  type: PCDActionType.ReplaceInFolder,
                  folder: "SBC SRW",
                  pcds: await Promise.all(
                    tickets.map((pcd) => EdDSATicketPCDPackage.serialize(pcd))
                  )
                }))
              ))
            );

            return { actions };
          },
          feed: {
            id: PCDPassFeedIds.Devconnect,
            name: "Devconnect Tickets",
            description: "Get your Devconnect tickets here!",
            inputPCDType: EdDSATicketPCDPackage.name,
            partialArgs: undefined,
            permissions: [
              {
                folder: "Devconnect",
                type: PCDPermissionType.AppendToFolder
              } as AppendToFolderPermission,
              {
                folder: "Devconnect",
                type: PCDPermissionType.ReplaceInFolder
              } as ReplaceInFolderPermission,
              {
                folder: "SBC SRW",
                type: PCDPermissionType.AppendToFolder
              } as AppendToFolderPermission,
              {
                folder: "SBC SRW",
                type: PCDPermissionType.ReplaceInFolder
              } as ReplaceInFolderPermission
            ],
            credentialType: SemaphoreSignaturePCDTypeName
          }
        },
        {
          handleRequest: async (
            _req: PollFeedRequest
          ): Promise<PollFeedResponseValue> => {
            return {
              actions: [
                {
                  pcds: await this.issueFrogPCDs(),
                  folder: "Frogs",
                  type: PCDActionType.AppendToFolder
                } as AppendToFolderAction
              ]
            };
          },
          feed: {
            id: PCDPassFeedIds.Frogs,
            name: "Frogs",
            description: "Get your Frogs here!",
            inputPCDType: undefined,
            partialArgs: undefined,
            permissions: [
              {
                folder: "Frogs",
                type: PCDPermissionType.AppendToFolder
              } as AppendToFolderPermission
            ],
            credentialType: SemaphoreSignaturePCDTypeName
          }
        },
        {
          handleRequest: async (
            req: PollFeedRequest<typeof SemaphoreSignaturePCDPackage>
          ): Promise<PollFeedResponseValue> => {
            const pcds = await this.issueEmailPCDs(
              req.pcd as SerializedPCD<SemaphoreSignaturePCD>
            );
            const actions: PCDAction[] = [];

            // Clear out the folder
            actions.push({
              type: PCDActionType.ReplaceInFolder,
              folder: "Email",
              pcds: []
            } as ReplaceInFolderAction);

            actions.push({
              type: PCDActionType.ReplaceInFolder,
              folder: "Email",
              pcds: await Promise.all(
                pcds.map((pcd) => EmailPCDPackage.serialize(pcd))
              )
            } as ReplaceInFolderAction);

            return { actions };
          },
          feed: {
            id: PCDPassFeedIds.Email,
            name: "PCDPass Verified Emails",
            description: "Emails verified by PCDPass",
            inputPCDType: EmailPCDPackage.name,
            partialArgs: undefined,
            permissions: [
              {
                folder: "Email",
                type: PCDPermissionType.AppendToFolder
              } as AppendToFolderPermission,
              {
                folder: "Email",
                type: PCDPermissionType.ReplaceInFolder
              } as ReplaceInFolderPermission
            ],
            credentialType: SemaphoreSignaturePCDTypeName
          }
        },
        {
          handleRequest: async (
            req: PollFeedRequest<typeof SemaphoreSignaturePCDPackage>
          ): Promise<PollFeedResponseValue> => {
            const pcds = await this.issueZuzaluTicketPCDs(
              req.pcd as SerializedPCD<SemaphoreSignaturePCD>
            );
            const actions: PCDAction[] = [];

            // Clear out the folder
            actions.push({
              type: PCDActionType.ReplaceInFolder,
              folder: "Zuzalu",
              pcds: []
            } as ReplaceInFolderAction);

            actions.push({
              type: PCDActionType.ReplaceInFolder,
              folder: "Zuzalu",
              pcds: await Promise.all(
                pcds.map((pcd) => EdDSATicketPCDPackage.serialize(pcd))
              )
            } as ReplaceInFolderAction);

            return { actions };
          },
          feed: {
            id: PCDPassFeedIds.Zuzalu_1,
            name: "Zuzalu tickets",
            description: "Your Zuzalu Tickets",
            inputPCDType: EdDSATicketPCD.name,
            partialArgs: undefined,
            permissions: [
              {
                folder: "Zuzalu",
                type: PCDPermissionType.AppendToFolder
              } as AppendToFolderPermission,
              {
                folder: "Zuzalu",
                type: PCDPermissionType.ReplaceInFolder
              } as ReplaceInFolderPermission
            ]
          }
        }
      ],
      `${process.env.PASSPORT_SERVER_URL}/feeds`,
      FEED_PROVIDER_NAME
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

  public getEdDSAPublicKey(): Promise<EDdSAPublicKey> {
    return getEdDSAPublicKey(this.eddsaPrivateKey);
  }

  public async handleCheckInRequest(
    request: CheckTicketInRequest
  ): Promise<CheckTicketInResult> {
    try {
      const ticketPCD = await EdDSATicketPCDPackage.deserialize(
        request.ticket.pcd
      );

      const ticketValid = await this.checkTicket(ticketPCD);

      if (ticketValid.error != null) {
        return ticketValid;
      }

      const ticketData = getEdDSATicketData(ticketPCD);

      if (!ticketData) {
        return {
          error: { name: "InvalidTicket" },
          success: false
        };
      }

      const checker = await this.checkUserExists(request.checkerProof);

      if (!checker) {
        return {
          error: { name: "NotSuperuser" },
          success: false
        };
      }

      const checkerSuperUserPermissions =
        await fetchDevconnectSuperusersForEmail(
          this.context.dbPool,
          checker.email
        );

      const relevantSuperUserPermission = checkerSuperUserPermissions.find(
        (perm) => perm.pretix_events_config_id === ticketData.eventId
      );

      if (!relevantSuperUserPermission) {
        return { error: { name: "NotSuperuser" }, success: false };
      }

      const successfullyConsumed = await consumeDevconnectPretixTicket(
        this.context.dbPool,
        ticketData.ticketId ?? "",
        checker.email
      );

      if (successfullyConsumed) {
        return {
          value: undefined,
          success: true
        };
      }

      return {
        error: { name: "ServerError" },
        success: false
      };
    } catch (e) {
      logger("Error when consuming devconnect ticket", { error: e });
      throw new PCDHTTPError(500, "failed to check in", { cause: e });
    }
  }

  public async handleCheckTicketRequest(
    request: CheckTicketRequest
  ): Promise<CheckTicketResult> {
    try {
      const ticketPCD = await EdDSATicketPCDPackage.deserialize(
        request.ticket.pcd
      );
      return this.checkTicket(ticketPCD);
    } catch (e) {
      return {
        error: { name: "ServerError" },
        success: false
      };
    }
  }

  public async checkTicket(
    ticketPCD: EdDSATicketPCD
  ): Promise<CheckTicketResult> {
    try {
      const proofPublicKey = ticketPCD.proof.eddsaPCD.claim.publicKey;
      if (!proofPublicKey) {
        return {
          error: {
            name: "InvalidSignature",
            detailedMessage: "Ticket malformed: missing public key."
          },
          success: false
        };
      }

      const serverPublicKey = await this.getEdDSAPublicKey();
      if (!_.isEqual(serverPublicKey, proofPublicKey)) {
        return {
          error: {
            name: "InvalidSignature",
            detailedMessage: "This ticket was not signed by PCDpass."
          },
          success: false
        };
      }

      const ticket = getEdDSATicketData(ticketPCD);

      if (!ticket || !ticket.ticketId) {
        return {
          error: {
            name: "InvalidTicket",
            detailedMessage: "Ticket malformed: missing data."
          },
          success: false
        };
      }

      const ticketInDb = await fetchDevconnectPretixTicketByTicketId(
        this.context.dbPool,
        ticket.ticketId
      );

      if (!ticketInDb) {
        return {
          error: {
            name: "InvalidTicket",
            detailedMessage: "Ticket does not exist on backend."
          },
          success: false
        };
      }

      if (ticketInDb.is_deleted) {
        return {
          error: { name: "TicketRevoked", revokedTimestamp: Date.now() },
          success: false
        };
      }

      if (ticketInDb.is_consumed) {
        return {
          error: {
            name: "AlreadyCheckedIn",
            checker: ticketInDb.checker ?? undefined,
            checkinTimestamp: (
              ticketInDb.pcdpass_checkin_timestamp ?? new Date()
            ).toISOString()
          },
          success: false
        };
      }

      return { value: undefined, success: true };
    } catch (e) {
      logger("Error when checking ticket", { error: e });
      return {
        error: { name: "ServerError", detailedMessage: getErrorMessage(e) },
        success: false
      };
    }
  }

  private async checkUserExists(
    proof: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<CommitmentRow | null> {
    const deserializedSignature =
      await SemaphoreSignaturePCDPackage.deserialize(proof.pcd);
    const isValid = await SemaphoreSignaturePCDPackage.verify(
      deserializedSignature
    );
    if (!isValid) {
      logger(
        `can't issue PCDs for ${deserializedSignature.claim.identityCommitment} because ` +
          `the requester's PCD didn't verify`
      );
      return null;
    }

    if (deserializedSignature.claim.signedMessage !== ISSUANCE_STRING) {
      logger(`can't issue PCDs, wrong message signed by user`);
      return null;
    }

    const requestingFor = deserializedSignature.claim.identityCommitment;
    const storedCommitment = await fetchCommitmentByPublicCommitment(
      this.context.dbPool,
      requestingFor
    );

    if (storedCommitment == null) {
      logger(
        `can't issue PCDs for ${deserializedSignature.claim.identityCommitment} because ` +
          `we don't have a user with that commitment in the database`
      );
      return null;
    }

    return storedCommitment;
  }

  /**
   * Fetch all DevconnectPretixTicket entities under a given user's email.
   */
  private async issueDevconnectPretixTicketPCDs(
    credential: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<EdDSATicketPCD[]> {
    return traced(
      "IssuanceService",
      "issueDevconnectPretixTicketPCDs",
      async (span) => {
        const commitmentRow = await this.checkUserExists(credential);
        const email = commitmentRow?.email;
        if (commitmentRow) {
          span?.setAttribute(
            "commitment",
            commitmentRow?.commitment?.toString() ?? ""
          );
        }
        if (email) {
          span?.setAttribute("email", email);
        }

        if (commitmentRow == null || email == null) {
          return [];
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
    const ticketCopy: any = { ...ticketData };
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
        t.pcdpass_checkin_timestamp == null
          ? 0
          : new Date(t.pcdpass_checkin_timestamp).getTime(),
      timestampSigned: Date.now(),
      attendeeSemaphoreId: semaphoreId,
      isConsumed: t.is_consumed,
      isRevoked: t.is_deleted,
      ticketCategory: TicketCategory.Devconnect
    } satisfies ITicketData;
  }

  private async issueFrogPCDs(): Promise<SerializedPCD[]> {
    const FROG_INTERVAL_MS = 1000 * 60 * 10; // one new frog every ten minutes
    const serverUrl = process.env.PASSPORT_CLIENT_URL;

    if (!serverUrl) {
      logger("[ISSUE] can't issue frogs - unaware of the client location");
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
          value: serverUrl + "/" + randomFrogPath
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
   * Issues email PCDs based on the user's verified email address.
   * Currently we only verify a single email address, but could provide
   * multiple PCDs if it were possible to verify secondary emails.
   */
  private async issueEmailPCDs(
    credential: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<EmailPCD[]> {
    return traced(
      "IssuanceService",
      "issueDevconnectPretixTicketPCDs",
      async (span) => {
        const commitmentRow = await this.checkUserExists(credential);
        const email = commitmentRow?.email;
        if (commitmentRow) {
          span?.setAttribute(
            "commitment",
            commitmentRow?.commitment?.toString() ?? ""
          );
        }
        if (email) {
          span?.setAttribute("email", email);
        }

        if (commitmentRow == null || email == null) {
          return [];
        }

        const stableId = "attested-email-" + email;

        return [
          await EmailPCDPackage.prove({
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
              value: commitmentRow.commitment,
              argumentType: ArgumentTypeName.String
            }
          })
        ];
      }
    );
  }

  private async issueZuzaluTicketPCDs(
    credential: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<EdDSATicketPCD[]> {
    return traced("IssuanceService", "issueZuzaluTicketPCDs", async (span) => {
      const commitmentRow = await this.checkUserExists(credential);
      const email = commitmentRow?.email;
      if (commitmentRow) {
        span?.setAttribute(
          "commitment",
          commitmentRow?.commitment?.toString() ?? ""
        );
      }
      if (email) {
        span?.setAttribute("email", email);
      }

      if (commitmentRow == null || email == null) {
        return [];
      }

      const user = await fetchLoggedInZuzaluUser(this.context.dbPool, {
        uuid: commitmentRow.uuid
      });

      const tickets = [];

      if (user) {
        tickets.push(
          await this.getOrGenerateTicket({
            attendeeSemaphoreId: user.commitment,
            eventName: "Zuzalu (March - May 2023)",
            checkerEmail: undefined,
            ticketId: user.uuid,
            ticketName: user.role.toString(),
            attendeeName: user.name,
            attendeeEmail: user.email,
            eventId:
              user.role === ZuzaluUserRole.Visitor
                ? ZUZALU_VISITOR_EVENT_ID
                : user.role === ZuzaluUserRole.Organizer
                ? ZUZALU_ORGANIZER_EVENT_ID
                : ZUZALU_RESIDENT_EVENT_ID,
            productId: ZUZALU_PRODUCT_ID,
            timestampSigned: Date.now(),
            timestampConsumed: 0,
            isConsumed: false,
            isRevoked: false,
            ticketCategory: TicketCategory.Zuzalu
          })
        );
      }

      return tickets;
    });
  }
}

export function startIssuanceService(
  context: ApplicationContext,
  cacheService: PersistentCacheService,
  rollbarService: RollbarService | null
): IssuanceService | null {
  const rsaKey = loadRSAPrivateKey();
  const eddsaKey = loadEdDSAPrivateKey();

  if (rsaKey == null || eddsaKey == null) {
    logger("[INIT] can't start issuance service, missing private key");
    return null;
  }

  const issuanceService = new IssuanceService(
    context,
    cacheService,
    rollbarService,
    rsaKey,
    eddsaKey
  );

  return issuanceService;
}

function loadRSAPrivateKey(): NodeRSA | null {
  const pkeyEnv = process.env.SERVER_RSA_PRIVATE_KEY_BASE64;

  if (pkeyEnv == null) {
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

function loadEdDSAPrivateKey(): string | null {
  const pkeyEnv = process.env.SERVER_EDDSA_PRIVATE_KEY;

  if (pkeyEnv == null) {
    logger("[INIT] missing environment variable SERVER_EDDSA_PRIVATE_KEY");
    return null;
  }

  return pkeyEnv;
}
