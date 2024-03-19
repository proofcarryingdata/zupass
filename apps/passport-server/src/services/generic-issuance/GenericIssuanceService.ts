import { EdDSAPublicKey, isEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  ActionConfigResponseValue,
  EdgeCityBalance,
  Feed,
  GenericIssuanceCheckInRequest,
  GenericIssuanceHistoricalSemaphoreGroupResponseValue,
  GenericIssuancePipelineListEntry,
  GenericIssuancePipelineSemaphoreGroupsResponseValue,
  GenericIssuancePreCheckRequest,
  GenericIssuanceSemaphoreGroupResponseValue,
  GenericIssuanceSemaphoreGroupRootResponseValue,
  GenericIssuanceValidSemaphoreGroupResponseValue,
  GenericPretixEvent,
  GenericPretixProduct,
  ListFeedsResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  TicketActionPayload
} from "@pcd/passport-interface";
import { PCDPermissionType, getPcdsFromActions } from "@pcd/pcd-collection";
import { newRSAPrivateKey } from "@pcd/rsa-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { str } from "@pcd/util";
import stytch, { Client } from "stytch";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../apis/pretix/genericPretixAPI";
import { getBalances } from "../../database/queries/edgecity";
import { IPipelineAtomDB } from "../../database/queries/pipelineAtomDB";
import {
  IPipelineCheckinDB,
  PipelineCheckinDB
} from "../../database/queries/pipelineCheckinDB";
import {
  IPipelineConsumerDB,
  PipelineConsumerDB
} from "../../database/queries/pipelineConsumerDB";
import {
  IPipelineSemaphoreHistoryDB,
  PipelineSemaphoreHistoryDB
} from "../../database/queries/pipelineSemaphoreHistoryDB";
import {
  IPipelineUserDB,
  PipelineUserDB
} from "../../database/queries/pipelineUserDB";
import {
  BadgeGiftingDB,
  ContactSharingDB,
  IBadgeGiftingDB,
  IContactSharingDB
} from "../../database/queries/ticketActionDBs";
import { PCDHTTPError } from "../../routing/pcdHttpError";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import { DiscordService } from "../discordService";
import { PagerDutyService } from "../pagerDutyService";
import { PersistentCacheService } from "../persistentCacheService";
import { RollbarService } from "../rollbarService";
import { traceFlattenedObject, traced } from "../telemetryService";
import { isCheckinCapability } from "./capabilities/CheckinCapability";
import {
  FeedIssuanceCapability,
  ensureFeedIssuanceCapability,
  isFeedIssuanceCapability
} from "./capabilities/FeedIssuanceCapability";
import {
  ensureSemaphoreGroupCapability,
  isSemaphoreGroupCapability
} from "./capabilities/SemaphoreGroupCapability";
import { tracePipeline, traceUser } from "./honeycombQueries";
import { Pipeline, PipelineUser } from "./pipelines/types";
import { GenericIssuancePipelineSubservice } from "./subservices/GenericIssuancePipelineSubservice";
import { GenericIssuanceUsersSubservice } from "./subservices/GenericIssuanceUsersSubservice";

const SERVICE_NAME = "GENERIC_ISSUANCE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export class GenericIssuanceService {
  private context: ApplicationContext;
  private userDB: IPipelineUserDB;
  private atomDB: IPipelineAtomDB;
  private checkinDB: IPipelineCheckinDB;
  private contactDB: IContactSharingDB;
  private badgeDB: IBadgeGiftingDB;
  private consumerDB: IPipelineConsumerDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private genericPretixAPI: IGenericPretixAPI;
  private rollbarService: RollbarService | null;
  private pipelineSubservice: GenericIssuancePipelineSubservice;
  private usersSubservice: GenericIssuanceUsersSubservice;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    atomDB: IPipelineAtomDB,
    lemonadeAPI: ILemonadeAPI,
    stytchClient: Client | undefined,
    genericIssuanceClientUrl: string,
    pretixAPI: IGenericPretixAPI,
    eddsaPrivateKey: string,
    zupassPublicKey: EdDSAPublicKey,
    pagerdutyService: PagerDutyService | null,
    discordService: DiscordService | null,
    cacheService: PersistentCacheService
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.userDB = new PipelineUserDB(context.dbPool);
    this.atomDB = atomDB;
    this.checkinDB = new PipelineCheckinDB(context.dbPool);
    this.consumerDB = new PipelineConsumerDB(context.dbPool);
    this.semaphoreHistoryDB = new PipelineSemaphoreHistoryDB(context.dbPool);
    this.genericPretixAPI = pretixAPI;
    this.contactDB = new ContactSharingDB(this.context.dbPool);
    this.badgeDB = new BadgeGiftingDB(this.context.dbPool);

    this.usersSubservice = new GenericIssuanceUsersSubservice(
      this.userDB,
      stytchClient,
      genericIssuanceClientUrl
    );

    this.pipelineSubservice = new GenericIssuancePipelineSubservice(
      context,
      eddsaPrivateKey,
      zupassPublicKey,
      newRSAPrivateKey(),
      this.userDB,
      atomDB,
      this.checkinDB,
      this.contactDB,
      this.badgeDB,
      this.consumerDB,
      this.semaphoreHistoryDB,
      cacheService,
      pagerdutyService,
      discordService,
      rollbarService,
      lemonadeAPI,
      this.genericPretixAPI
    );
  }

  public async start(startLoadLoop?: boolean): Promise<void> {
    try {
      await this.pipelineSubservice.start(startLoadLoop);
      await this.usersSubservice.start();
    } catch (e) {
      this.rollbarService?.reportError(e);
      logger(LOG_TAG, "error starting GenericIssuanceService", e);
      throw e;
    }
  }

  public async stop(): Promise<void> {
    await this.pipelineSubservice.stop();
  }

  public async getAllUserPipelineDefinitions(
    user: PipelineUser
  ): Promise<GenericIssuancePipelineListEntry[]> {
    return this.pipelineSubservice.getAllUserPipelineDefinitions(user);
  }

  public getUserSubservice(): GenericIssuanceUsersSubservice {
    return this.usersSubservice;
  }

  /**
   * Handles incoming requests that hit a Pipeline-specific feed for PCDs
   * for every single pipeline that has this capability that this server manages.
   */
  public async handlePollFeed(
    pipelineId: string,
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return traced(SERVICE_NAME, "handlePollFeed", async (span) => {
      logger(LOG_TAG, `handlePollFeed`, pipelineId, str(req));
      span?.setAttribute("feed_id", req.feedId);
      const pipelineSlot =
        await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
      tracePipeline(pipelineSlot.definition);
      const pipeline =
        await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
      const feed = ensureFeedIssuanceCapability(pipeline, req.feedId);
      const feedResponse = await feed.issue(req);

      traceFlattenedObject(span, {
        result: {
          actionCount: feedResponse.actions.length,
          pcdCount: getPcdsFromActions(feedResponse.actions).length
        }
      });

      return feedResponse;
    });
  }

  public async handleGetPipelineInfo(
    user: PipelineUser,
    pipelineId: string
  ): Promise<PipelineInfoResponseValue> {
    return traced(SERVICE_NAME, "handleGetPipelineInfo", async (span) => {
      logger(LOG_TAG, "handleGetPipelineInfo", str(user), pipelineId);
      traceUser(user);
      const pipelineSlot =
        await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
      tracePipeline(pipelineSlot.definition);
      const pipelineInstance =
        await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
      this.pipelineSubservice.ensureUserHasPipelineDefinitionAccess(
        user,
        pipelineSlot.definition
      );

      const pipelineFeeds: FeedIssuanceCapability[] =
        pipelineInstance.capabilities.filter(isFeedIssuanceCapability);

      const summary = await this.pipelineSubservice.getLastLoadSummary(
        pipelineInstance.id
      );
      const latestAtoms = await this.atomDB.load(pipelineInstance.id);

      // If the pipeline has semaphore groups, we want to populate consumer
      // data. If there are no semaphore groups, we don't.
      // Rather than inspect the configuration, which depends on knowing all
      // of the possible pipeline types and the structure of their
      // configurations, we can ask the SemaphoreGroupCapability if it has any
      // groups (if one exists). Only if the SemaphoreGroupCapability exists
      // and has supported groups will we include consumer data.
      let pipelineHasSemaphoreGroups = false;
      const semaphoreGroupCapability = pipelineInstance.capabilities.find(
        isSemaphoreGroupCapability
      );
      if (
        semaphoreGroupCapability &&
        semaphoreGroupCapability.getSupportedGroups().length > 0
      ) {
        pipelineHasSemaphoreGroups = true;
      }

      // Only actually run the query if there are Semaphore groups
      const latestConsumers = pipelineHasSemaphoreGroups
        ? await this.consumerDB.loadAll(pipelineInstance.id)
        : [];

      if (!pipelineSlot.owner) {
        throw new Error("owner does not exist");
      }

      const info = {
        feeds: pipelineFeeds.map((f) => ({
          name: f.options.feedDisplayName,
          url: f.feedUrl
        })),
        latestAtoms: latestAtoms,
        latestConsumers: !pipelineHasSemaphoreGroups
          ? undefined
          : latestConsumers
              .map((consumer) => ({
                email: consumer.email,
                commitment: consumer.commitment,
                timeCreated: consumer.timeCreated.toISOString(),
                timeUpdated: consumer.timeUpdated.toISOString()
              }))
              .sort((a, b) => b.timeUpdated.localeCompare(a.timeUpdated)),
        lastLoad: summary,
        ownerEmail: pipelineSlot.owner.email
      } satisfies PipelineInfoResponseValue;

      traceFlattenedObject(span, { loadSummary: summary });
      traceFlattenedObject(span, { pipelineFeeds });

      return info;
    });
  }

  public getAllPipelineInstances(): Promise<Pipeline[]> {
    return this.pipelineSubservice.getAllPipelineInstances();
  }

  /**
   * Accessible to public internet
   */
  public async handleListFeed(
    pipelineId: string,
    feedId: string
  ): Promise<ListFeedsResponseValue> {
    return traced(SERVICE_NAME, "handleListFeed", async (span) => {
      span?.setAttribute("feed_id", feedId);
      const pipelineSlot =
        await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
      const pipeline =
        await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
      tracePipeline(pipelineSlot.definition);

      const feedCapability = ensureFeedIssuanceCapability(pipeline, feedId);

      const result = {
        feeds: [
          {
            id: feedId,
            name: feedCapability.options.feedDisplayName,
            description: feedCapability.options.feedDescription,
            permissions: [
              {
                folder: feedCapability.options.feedFolder,
                type: PCDPermissionType.DeleteFolder
              },
              {
                folder: feedCapability.options.feedFolder,
                type: PCDPermissionType.AppendToFolder
              },
              {
                folder: feedCapability.options.feedFolder,
                type: PCDPermissionType.ReplaceInFolder
              }
            ],
            credentialRequest: {
              signatureType: "sempahore-signature-pcd",
              pcdType: "email-pcd"
            }
          } satisfies Feed
        ],
        providerName: "Podbox",
        providerUrl: feedCapability.feedUrl
      } satisfies ListFeedsResponseValue;

      traceFlattenedObject(span, {
        feedCount: result.feeds.length
      });

      return result;
    });
  }

  /**
   * Handles incoming requests that hit a Pipeline which implements the checkin
   * capability for every pipeline this server manages.
   */
  public async handleCheckIn(
    req: GenericIssuanceCheckInRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return traced(SERVICE_NAME, "handleCheckIn", async (span) => {
      logger(LOG_TAG, "handleCheckIn", str(req));

      // This is sub-optimal, but since tickets do not identify the pipelines
      // they come from, we have to match the ticket to the pipeline this way.
      const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
        req.credential.pcd
      );
      const signaturePCDValid =
        await SemaphoreSignaturePCDPackage.verify(signaturePCD);

      if (!signaturePCDValid) {
        throw new Error("credential signature invalid");
      }

      const payload: TicketActionPayload = JSON.parse(
        signaturePCD.claim.signedMessage
      );

      const eventId = payload.eventId;
      // TODO detect mismatch between eventId and ticketId?

      span?.setAttribute("event_id", eventId);

      for (const pipeline of this.pipelineSubservice.getAllPipelines()) {
        if (!pipeline.instance) {
          continue;
        }

        for (const capability of pipeline?.instance.capabilities) {
          if (
            isCheckinCapability(capability) &&
            capability.canHandleCheckinForEvent(eventId)
          ) {
            tracePipeline(pipeline.definition);
            const res = await capability.checkin(req);
            traceFlattenedObject(span, { res });
            return res;
          }
        }
      }

      throw new PCDHTTPError(
        403,
        `can't find pipeline to check-in for event ${eventId}`
      );
    });
  }

  /**
   * Checks that a ticket could be checked in by the current user.
   */
  public async handlePreCheck(
    req: GenericIssuancePreCheckRequest
  ): Promise<ActionConfigResponseValue> {
    return traced(SERVICE_NAME, "handlePreCheck", async (span) => {
      logger(SERVICE_NAME, "handlePreCheck", str(req));

      // This is sub-optimal, but since tickets do not identify the pipelines
      // they come from, we have to match the ticket to the pipeline this way.
      const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
        req.credential.pcd
      );
      const signaturePCDValid =
        await SemaphoreSignaturePCDPackage.verify(signaturePCD);

      if (!signaturePCDValid) {
        throw new Error("credential signature invalid");
      }

      const payload: TicketActionPayload = JSON.parse(
        signaturePCD.claim.signedMessage
      );

      const eventId = payload.eventId;
      span?.setAttribute("event_id", eventId);

      for (const pipeline of this.pipelineSubservice.getAllPipelines()) {
        if (!pipeline.instance) {
          continue;
        }

        for (const capability of pipeline.instance.capabilities) {
          if (
            isCheckinCapability(capability) &&
            capability.canHandleCheckinForEvent(eventId)
          ) {
            tracePipeline(pipeline.definition);
            const res = await capability.preCheck(req);
            traceFlattenedObject(span, { res });
            return res;
          }
        }
      }

      throw new PCDHTTPError(
        403,
        `can't find pipeline to check-in for event ${eventId}`
      );
    });
  }

  public async handleGetSemaphoreGroup(
    pipelineId: string,
    groupId: string
  ): Promise<GenericIssuanceSemaphoreGroupResponseValue> {
    return traced(SERVICE_NAME, "handleGetSemaphoreGroup", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);
      span?.setAttribute("group_id", groupId);
      const pipelineSlot =
        await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
      const pipeline =
        await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
      tracePipeline(pipelineSlot.definition);

      const semaphoreGroupCapability = ensureSemaphoreGroupCapability(pipeline);

      // Retrieving this via the capability might be unnecessary, since we have
      // access to the PipelineSemaphoreGroupDB already, and could just look the
      // data up from there.
      const serializedGroup =
        await semaphoreGroupCapability.getSerializedLatestGroup(groupId);
      if (!serializedGroup) {
        throw new PCDHTTPError(
          403,
          `can't find semaphore group ${groupId} for pipeline ${pipelineId}`
        );
      }

      return serializedGroup;
    });
  }

  public async handleGetLatestSemaphoreGroupRoot(
    pipelineId: string,
    groupId: string
  ): Promise<GenericIssuanceSemaphoreGroupRootResponseValue> {
    return traced(
      SERVICE_NAME,
      "handleGetLatestSemaphoreGroupRoot",
      async (span) => {
        span?.setAttribute("pipeline_id", pipelineId);
        span?.setAttribute("group_id", groupId);
        const pipelineSlot =
          await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
        const pipeline =
          await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
        tracePipeline(pipelineSlot.definition);

        const semaphoreGroupCapability =
          ensureSemaphoreGroupCapability(pipeline);

        // Retrieving this via the capability might be unnecessary, since we have
        // access to the PipelineSemaphoreGroupDB already, and could just look the
        // data up from there.
        const rootHash =
          await semaphoreGroupCapability.getLatestGroupRoot(groupId);
        if (rootHash === undefined) {
          throw new PCDHTTPError(
            403,
            `can't find semaphore group ${groupId} for pipeline ${pipelineId}`
          );
        }

        return rootHash;
      }
    );
  }

  public async handleGetHistoricalSemaphoreGroup(
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<GenericIssuanceHistoricalSemaphoreGroupResponseValue> {
    return traced(
      SERVICE_NAME,
      "handleGetHistoricalSemaphoreGroup",
      async (span) => {
        span?.setAttribute("pipeline_id", pipelineId);
        span?.setAttribute("group_id", groupId);
        span?.setAttribute("root_hash", rootHash);
        const pipelineSlot =
          await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
        const pipeline =
          await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
        tracePipeline(pipelineSlot.definition);

        const semaphoreGroupCapability =
          ensureSemaphoreGroupCapability(pipeline);
        const serializedGroup =
          await semaphoreGroupCapability.getSerializedHistoricalGroup(
            groupId,
            rootHash
          );
        if (!serializedGroup) {
          throw new PCDHTTPError(
            403,
            `can't find semaphore group ${groupId} for pipeline ${pipelineId}`
          );
        }

        return serializedGroup;
      }
    );
  }

  public async upsertPipelineDefinition(
    user: PipelineUser,
    pipelineDefinition: PipelineDefinition
  ): Promise<{
    definition: PipelineDefinition;
    restartPromise: Promise<void>;
  }> {
    return this.pipelineSubservice.upsertPipelineDefinition(
      user,
      pipelineDefinition
    );
  }

  public async deletePipelineDefinition(
    user: PipelineUser,
    pipelineId: string
  ): Promise<void> {
    return this.pipelineSubservice.deletePipelineDefinition(user, pipelineId);
  }

  public async loadPipelineDefinition(
    user: PipelineUser,
    id: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineSubservice.loadPipelineDefinitionForUser(user, id);
  }

  public async handleGetValidSemaphoreGroup(
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<GenericIssuanceValidSemaphoreGroupResponseValue> {
    return traced(
      SERVICE_NAME,
      "handleGetValidSemaphoreGroup",
      async (span) => {
        span?.setAttribute("pipeline_id", pipelineId);
        span?.setAttribute("group_id", groupId);
        span?.setAttribute("root_hash", rootHash);
        const pipelineSlot =
          await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
        const pipeline =
          await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
        tracePipeline(pipelineSlot.definition);
        const semaphoreGroupCapability =
          ensureSemaphoreGroupCapability(pipeline);
        const serializedGroup =
          await semaphoreGroupCapability.getSerializedHistoricalGroup(
            groupId,
            rootHash
          );

        return {
          valid: serializedGroup !== undefined
        };
      }
    );
  }

  public async handleGetPipelineSemaphoreGroups(
    pipelineId: string
  ): Promise<GenericIssuancePipelineSemaphoreGroupsResponseValue> {
    return traced(
      SERVICE_NAME,
      "handleGetPipelineSemaphoreGroups",
      async (span) => {
        span?.setAttribute("pipeline_id", pipelineId);
        const pipelineSlot =
          await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
        const pipeline =
          await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
        tracePipeline(pipelineSlot.definition);
        const semaphoreGroupCapability =
          ensureSemaphoreGroupCapability(pipeline);

        return semaphoreGroupCapability.getSupportedGroups();
      }
    );
  }

  public async fetchAllPretixEvents(
    orgUrl: string,
    token: string
  ): Promise<GenericPretixEvent[]> {
    return this.genericPretixAPI.fetchAllEvents(orgUrl, token);
  }

  public async fetchPretixProducts(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<GenericPretixProduct[]> {
    return this.genericPretixAPI.fetchProducts(orgUrl, token, eventID);
  }

  public async getBalances(): Promise<EdgeCityBalance[]> {
    return getBalances(this.context.dbPool);
  }
}

export async function startGenericIssuanceService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  lemonadeAPI: ILemonadeAPI | null,
  genericPretixAPI: IGenericPretixAPI | null,
  pagerDutyService: PagerDutyService | null,
  discordService: DiscordService | null,
  cacheService: PersistentCacheService | null
): Promise<GenericIssuanceService | null> {
  logger("[INIT] attempting to start Generic Issuance service");

  if (!cacheService) {
    logger(
      "[INIT] not starting generic issuance service - missing persistent cache service"
    );
    return null;
  }

  if (!lemonadeAPI) {
    logger(
      "[INIT] not starting generic issuance service - missing lemonade API"
    );
    return null;
  }

  if (!genericPretixAPI) {
    logger("[INIT] not starting generic issuance service - missing pretix API");
    return null;
  }

  const pkeyEnv = process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY;
  if (pkeyEnv == null) {
    logger(
      "[INIT] missing environment variable GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY"
    );
    return null;
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.STYTCH_BYPASS === "true"
  ) {
    throw new Error(
      "cannot create generic issuance service without stytch in production "
    );
  }

  const BYPASS_EMAIL =
    process.env.NODE_ENV !== "production" &&
    process.env.STYTCH_BYPASS === "true";

  const projectIdEnv = process.env.STYTCH_PROJECT_ID;
  const secretEnv = process.env.STYTCH_SECRET;
  let stytchClient: Client | undefined = undefined;

  if (!BYPASS_EMAIL) {
    if (projectIdEnv == null) {
      logger("[INIT] missing environment variable STYTCH_PROJECT_ID");
      return null;
    }

    if (secretEnv == null) {
      logger("[INIT] missing environment variable STYTCH_SECRET");
      return null;
    }

    stytchClient = new stytch.Client({
      project_id: projectIdEnv,
      secret: secretEnv
    });
  }

  const genericIssuanceClientUrl = process.env.GENERIC_ISSUANCE_CLIENT_URL;
  if (genericIssuanceClientUrl == null) {
    logger("[INIT] missing GENERIC_ISSUANCE_CLIENT_URL");
    return null;
  }

  const zupassPublicKeyEnv = process.env.GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY;
  if (!zupassPublicKeyEnv) {
    logger("[INIT missing GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY");
    return null;
  }

  let zupassPublicKey: EdDSAPublicKey;
  try {
    zupassPublicKey = JSON.parse(zupassPublicKeyEnv);
    if (!isEdDSAPublicKey(zupassPublicKey)) {
      throw new Error("Invalid public key");
    }
  } catch (e) {
    logger("[INIT] invalid GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY");
    return null;
  }

  const issuanceService = new GenericIssuanceService(
    context,
    rollbarService,
    context.pipelineAtomDB,
    lemonadeAPI,
    stytchClient,
    genericIssuanceClientUrl,
    genericPretixAPI,
    pkeyEnv,
    zupassPublicKey,
    pagerDutyService,
    discordService,
    cacheService
  );

  issuanceService.start();

  return issuanceService;
}
