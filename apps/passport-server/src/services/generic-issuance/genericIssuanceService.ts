import { EdDSAPublicKey, isEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  Feed,
  GenericCheckinCredentialPayload,
  GenericIssuanceCheckInRequest,
  GenericIssuanceCheckInResponseValue,
  GenericIssuancePipelineListEntry,
  GenericIssuancePreCheckRequest,
  GenericIssuancePreCheckResponseValue,
  GenericIssuanceSendEmailResponseValue,
  ListFeedsResponseValue,
  PipelineDefinition,
  PipelineDefinitionSchema,
  PipelineInfoResponseValue,
  PipelineRunInfo,
  PipelineType,
  PollFeedRequest,
  PollFeedResponseValue,
  PretixPipelineDefinition
} from "@pcd/passport-interface";
import { PCDPermissionType, getPcdsFromActions } from "@pcd/pcd-collection";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { normalizeEmail, str } from "@pcd/util";
import { randomUUID } from "crypto";
import { Request } from "express";
import stytch, { Client, Session } from "stytch";
import { v4 as uuidV4 } from "uuid";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../apis/pretix/genericPretixAPI";
import { IPipelineAtomDB } from "../../database/queries/pipelineAtomDB";
import {
  IPipelineDefinitionDB,
  PipelineDefinitionDB
} from "../../database/queries/pipelineDefinitionDB";
import {
  IPipelineUserDB,
  PipelineUserDB
} from "../../database/queries/pipelineUserDB";
import { sqlQuery } from "../../database/sqlQuery";
import { PCDHTTPError } from "../../routing/pcdHttpError";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import { RollbarService } from "../rollbarService";
import { setError, setFlattenedObject, traced } from "../telemetryService";
import { isCheckinCapability } from "./capabilities/CheckinCapability";
import {
  FeedIssuanceCapability,
  ensureFeedIssuanceCapability,
  isFeedIssuanceCapability
} from "./capabilities/FeedIssuanceCapability";
import { instantiatePipeline } from "./pipelines/instantiatePipeline";
import { Pipeline, PipelineUser } from "./pipelines/types";
import { makePLogErr } from "./util";

const SERVICE_NAME = "GENERIC_ISSUANCE";
const LOG_TAG = `[${SERVICE_NAME}]`;

/**
 * It's not always possible to start a {@link Pipeline} given a {@link PipelineDefinition}
 * because a pipeline could be misconfigured.
 *
 * An {@link PipelineSlot} is used to represent a pair of {@link PipelineDefinition} and
 * its corresponding {@link Pipeline} if one was able to be started.
 */
export interface PipelineSlot {
  definition: PipelineDefinition;
  pipelineInstance?: Pipeline;
}

export class GenericIssuanceService {
  /**
   * The pipeline data reload algorithm works as follows:
   * 1. concurrently load all data for all pipelines
   * 2. save that data
   * 3. wait {@link PIPELINE_REFRESH_INTERVAL_MS} milliseconds
   * 4. go back to step one
   */
  private static readonly PIPELINE_REFRESH_INTERVAL_MS = 60_000;

  private context: ApplicationContext;
  private rollbarService: RollbarService | null;

  private userDB: IPipelineUserDB;
  private definitionDB: IPipelineDefinitionDB;
  private atomDB: IPipelineAtomDB;

  private lemonadeAPI: ILemonadeAPI;
  private genericPretixAPI: IGenericPretixAPI;
  private stytchClient: Client;

  private genericIssuanceClientUrl: string;
  private eddsaPrivateKey: string;
  private zupassPublicKey: EdDSAPublicKey;
  private bypassEmail: boolean;
  private pipelineSlots: PipelineSlot[];
  private nextLoadTimeout: NodeJS.Timeout | undefined;
  private stopped = false;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    atomDB: IPipelineAtomDB,
    lemonadeAPI: ILemonadeAPI,
    stytchClient: Client,
    genericIssuanceClientUrl: string,
    pretixAPI: IGenericPretixAPI,
    eddsaPrivateKey: string,
    zupassPublicKey: EdDSAPublicKey
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.userDB = new PipelineUserDB(context.dbPool);
    this.definitionDB = new PipelineDefinitionDB(context.dbPool);
    this.atomDB = atomDB;
    this.lemonadeAPI = lemonadeAPI;
    this.genericPretixAPI = pretixAPI;
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.pipelineSlots = [];
    this.stytchClient = stytchClient;
    this.genericIssuanceClientUrl = genericIssuanceClientUrl;
    this.bypassEmail =
      process.env.BYPASS_EMAIL_REGISTRATION === "true" &&
      process.env.NODE_ENV !== "production";
    this.zupassPublicKey = zupassPublicKey;
  }

  public async start(): Promise<void> {
    try {
      await this.maybeInsertLocalDevTestPipeline();
      await this.maybeSetupAdmins();
      await this.startPipelinesFromDefinitions();
      this.schedulePipelineLoadLoop();
    } catch (e) {
      this.rollbarService?.reportError(e);
      logger(LOG_TAG, "error starting GenericIssuanceService", e);
      throw e;
    }
  }

  public async stop(): Promise<void> {
    if (this.stopped) {
      logger(LOG_TAG, "already stopped - not stopping");
      return;
    }

    logger(LOG_TAG, "stopping");

    this.stopped = true;
    if (this.nextLoadTimeout) {
      clearTimeout(this.nextLoadTimeout);
      this.nextLoadTimeout = undefined;
    }
  }

  public async startPipelinesFromDefinitions(): Promise<void> {
    return traced(
      SERVICE_NAME,
      "startPipelinesFromDefinitions",
      async (span) => {
        const pipelinesFromDB =
          await this.definitionDB.loadPipelineDefinitions();

        span?.setAttribute("pipeline_count", pipelinesFromDB.length);

        await Promise.allSettled(
          this.pipelineSlots.map(async (entry) => {
            if (entry.pipelineInstance) {
              await entry.pipelineInstance.stop();
            }
          })
        );

        this.pipelineSlots = await Promise.all(
          pipelinesFromDB.map(async (definition: PipelineDefinition) => {
            const result: PipelineSlot = {
              definition
            };

            try {
              const pipeline = await instantiatePipeline(
                this.eddsaPrivateKey,
                definition,
                this.atomDB,
                {
                  lemonadeAPI: this.lemonadeAPI,
                  genericPretixAPI: this.genericPretixAPI
                },
                this.zupassPublicKey
              );
              result.pipelineInstance = pipeline;
            } catch (e) {
              this.rollbarService?.reportError(e);
              logger(LOG_TAG, "failed to create pipeline", e);
              setError(e, span);
            }

            return result;
          })
        );
      }
    );
  }

  private async executeSinglePipeline(
    inMemoryPipeline: PipelineSlot
  ): Promise<PipelineRunInfo> {
    return traced<PipelineRunInfo>(
      SERVICE_NAME,
      "executeSinglePipeline",
      async (span): Promise<PipelineRunInfo> => {
        const start = Date.now();
        logger(
          LOG_TAG,
          `executing pipeline '${inMemoryPipeline.definition.id}'` +
            ` of type '${inMemoryPipeline.definition.type}'` +
            ` belonging to ${inMemoryPipeline.definition.ownerUserId}`
        );
        span?.setAttribute("pipeline_id", inMemoryPipeline.definition.id);
        span?.setAttribute("pipeline_type", inMemoryPipeline.definition.type);
        span?.setAttribute(
          "owner_user_id",
          inMemoryPipeline.definition.ownerUserId
        );

        const pipelineId = inMemoryPipeline.definition.id;
        const pipeline = inMemoryPipeline.pipelineInstance;

        if (!pipeline) {
          logger(
            LOG_TAG,
            `pipeline '${pipelineId}' of type '${inMemoryPipeline.definition.type}' is not running; skipping execution`
          );
          const newInfo: PipelineRunInfo = {
            lastRunStartTimestamp: start,
            lastRunEndTimestamp: start,
            latestLogs: [makePLogErr("failed to start pipeline")],
            atomsLoaded: 0,
            success: false
          };
          this.definitionDB.saveLastRunInfo(pipelineId, newInfo);
          setFlattenedObject(span, newInfo);
          return newInfo;
        }

        try {
          logger(
            LOG_TAG,
            `loading data for pipeline with id '${pipelineId}'` +
              ` of type '${inMemoryPipeline.definition.type}'`
          );
          const newInfo = await pipeline.load();
          logger(
            LOG_TAG,
            `successfully loaded data for pipeline with id '${pipelineId}'` +
              ` of type '${inMemoryPipeline.definition.type}'`,
            newInfo
          );
          this.definitionDB.saveLastRunInfo(pipelineId, newInfo);
          setFlattenedObject(span, newInfo);
          return newInfo;
        } catch (e) {
          this.rollbarService?.reportError(e);
          logger(LOG_TAG, `failed to load pipeline '${pipelineId}'`, e);
          setError(e, span);
          const newInfo = {
            lastRunStartTimestamp: start,
            lastRunEndTimestamp: Date.now(),
            latestLogs: [makePLogErr(`failed to start pipeline: ${e + ""}`)],
            atomsLoaded: 0,
            success: false
          };
          this.definitionDB.saveLastRunInfo(pipelineId, newInfo);
          setFlattenedObject(span, newInfo);
          return newInfo;
        }
      }
    );
  }

  public async executeAllPipelineLoads(): Promise<void> {
    return traced(SERVICE_NAME, "executeAllPipelineLoads", async (span) => {
      const pipelineIds = str(this.pipelineSlots.map((p) => p.definition.id));
      logger(
        LOG_TAG,
        `loading data for ${this.pipelineSlots.length} pipelines. ids are: ${pipelineIds}`
      );
      span?.setAttribute("pipeline_ids", pipelineIds);

      await Promise.allSettled(
        this.pipelineSlots.map(async (slot: PipelineSlot): Promise<void> => {
          const runInfo = await this.executeSinglePipeline(slot);
          await this.definitionDB.saveLastRunInfo(slot.definition.id, runInfo);
        })
      );
    });
  }

  /**
   * Loads all data for all pipelines (that have been started). Waits 60s,
   * then loads all data for all loaded pipelines again.
   */
  private async schedulePipelineLoadLoop(): Promise<void> {
    return traced(SERVICE_NAME, "schedulePipelineLoadLoop", async (span) => {
      try {
        logger(LOG_TAG, "refreshing pipeline datas");
        await this.executeAllPipelineLoads();
        logger(LOG_TAG, "pipeline datas refreshed");
      } catch (e) {
        setError(e, span);
        this.rollbarService?.reportError(e);
        logger(LOG_TAG, "pipeline datas failed to refresh", e);
      }

      if (this.stopped) {
        span?.setAttribute("stopped", true);
        return;
      }

      logger(
        LOG_TAG,
        "scheduling next pipeline refresh for",
        Math.floor(GenericIssuanceService.PIPELINE_REFRESH_INTERVAL_MS / 1000),
        "s from now"
      );
      span?.setAttribute(
        "timeout_ms",
        GenericIssuanceService.PIPELINE_REFRESH_INTERVAL_MS
      );

      this.nextLoadTimeout = setTimeout(() => {
        if (this.stopped) {
          return;
        }
        this.schedulePipelineLoadLoop();
      }, GenericIssuanceService.PIPELINE_REFRESH_INTERVAL_MS);
    });
  }

  private async getPipelineSlot(id: string): Promise<PipelineSlot | undefined> {
    return this.pipelineSlots.find((p) => p.definition.id === id);
  }

  private async ensurePipelineSlotExists(id: string): Promise<PipelineSlot> {
    const pipeline = await this.getPipelineSlot(id);
    if (!pipeline) {
      throw new Error(`no pipeline with id ${id} found`);
    }
    return pipeline;
  }

  private async ensurePipelineStarted(id: string): Promise<Pipeline> {
    const pipeline = await this.ensurePipelineSlotExists(id);
    if (!pipeline.pipelineInstance) {
      throw new Error(`no pipeline instance with id ${id} found`);
    }
    return pipeline.pipelineInstance;
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
      span?.setAttribute("pipeline_id", pipelineId);
      span?.setAttribute("feed_id", req.feedId);
      const pipelineSlot = await this.ensurePipelineSlotExists(pipelineId);
      span?.setAttribute(
        "pipeline_owner_id",
        pipelineSlot.definition.ownerUserId
      );
      span?.setAttribute("pipeline_type", pipelineSlot.definition.type);

      const pipeline = await this.ensurePipelineStarted(pipelineId);
      const feed = ensureFeedIssuanceCapability(pipeline, req.feedId);
      const feedResponse = await feed.issue(req);

      setFlattenedObject(span, {
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
      span?.setAttribute("user_id", user.id);
      span?.setAttribute("pipeline_id", pipelineId);

      const pipelineSlot = await this.ensurePipelineSlotExists(pipelineId);
      const pipelineInstance = await this.ensurePipelineStarted(pipelineId);

      this.ensureUserHasPipelineDefinitionAccess(user, pipelineSlot.definition);

      const pipelineFeeds: FeedIssuanceCapability[] =
        pipelineInstance.capabilities.filter(isFeedIssuanceCapability);

      const latestRun = await this.definitionDB.getLatestRunInfo(
        pipelineInstance.id
      );
      const latestAtoms = await this.atomDB.load(pipelineInstance.id);

      const info = {
        feeds: pipelineFeeds.map((f) => ({
          name: f.options.feedDisplayName,
          url: f.feedUrl
        })),
        latestAtoms: latestAtoms,
        latestRun: latestRun
      } satisfies PipelineInfoResponseValue;

      setFlattenedObject(span, { latestRun });
      setFlattenedObject(span, { pipelineFeeds });

      return info;
    });
  }

  /**
   * Accessible to public internet
   */
  public async handleListFeed(
    pipelineId: string,
    feedId: string
  ): Promise<ListFeedsResponseValue> {
    return traced(SERVICE_NAME, "handleListFeed", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);
      span?.setAttribute("feed_id", feedId);

      const pipeline = await this.ensurePipelineStarted(pipelineId);
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
        providerName: "PCD-ifier",
        providerUrl: feedCapability.feedUrl
      } satisfies ListFeedsResponseValue;

      setFlattenedObject(span, {
        feedCount: result.feeds.length
      });

      return result;
    });
  }

  /**
   * Handles incoming requests that hit a Pipeline which implements the checkin
   * capability for every pipeline this server manages.
   *
   * TODO: better logging and tracing.
   */
  public async handleCheckIn(
    req: GenericIssuanceCheckInRequest
  ): Promise<GenericIssuanceCheckInResponseValue> {
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

      const payload: GenericCheckinCredentialPayload = JSON.parse(
        signaturePCD.claim.signedMessage
      );

      const eventId = payload.eventId;
      // TODO detect mismatch between eventId and ticketId?

      span?.setAttribute("event_id", eventId);

      for (const pipeline of this.pipelineSlots) {
        if (!pipeline.pipelineInstance) {
          continue;
        }

        for (const capability of pipeline?.pipelineInstance.capabilities) {
          if (
            isCheckinCapability(capability) &&
            capability.canHandleCheckinForEvent(eventId)
          ) {
            span?.setAttribute("pipeline_id", pipeline.definition.id);
            span?.setAttribute("pipeline_type", pipeline.definition.type);
            const res = await capability.checkin(req);
            setFlattenedObject(span, { res });
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
  ): Promise<GenericIssuancePreCheckResponseValue> {
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

      const payload: GenericCheckinCredentialPayload = JSON.parse(
        signaturePCD.claim.signedMessage
      );

      const eventId = payload.eventId;
      span?.setAttribute("event_id", eventId);

      for (const pipeline of this.pipelineSlots) {
        if (!pipeline.pipelineInstance) {
          continue;
        }

        for (const capability of pipeline.pipelineInstance.capabilities) {
          if (
            isCheckinCapability(capability) &&
            capability.canHandleCheckinForEvent(eventId)
          ) {
            span?.setAttribute("pipeline_id", pipeline.definition.id);
            span?.setAttribute("pipeline_type", pipeline.definition.type);
            const res = await capability.preCheck(req);
            setFlattenedObject(span, { res });
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
   * Gets all piplines this user can see.
   */
  public async getAllUserPipelineDefinitions(
    user: PipelineUser
  ): Promise<GenericIssuancePipelineListEntry[]> {
    return traced(
      SERVICE_NAME,
      "getAllUserPipelineDefinitions",
      async (span) => {
        logger(SERVICE_NAME, "getAllUserPipelineDefinitions", str(user));

        const allDefinitions: PipelineDefinition[] =
          await this.definitionDB.loadPipelineDefinitions();

        const visiblePipelines = allDefinitions.filter((d) =>
          this.userHasPipelineDefinitionAccess(user, d)
        );
        span?.setAttribute("pipeline_count", visiblePipelines.length);

        return Promise.all(
          visiblePipelines.map(async (p) => {
            const owner = await this.userDB.getUser(p.ownerUserId);
            if (!owner) {
              throw new Error(`couldn't load user for id '${p.ownerUserId}'`);
            }
            const lastRun = await this.definitionDB.getLatestRunInfo(p.id);
            return {
              extraInfo: {
                ownerEmail: owner.email,
                lastRun
              },
              pipeline: p
            } satisfies GenericIssuancePipelineListEntry;
          })
        );
      }
    );
  }

  /**
   * Returns whether or not the given {@link PipelineUser} has
   * access to the given {@link Pipeline}.
   */
  private userHasPipelineDefinitionAccess(
    user: PipelineUser | undefined,
    pipeline: PipelineDefinition
  ): boolean {
    if (!user) {
      return false;
    }

    return (
      user.isAdmin ||
      pipeline.ownerUserId === user.id ||
      pipeline.editorUserIds.includes(user.id)
    );
  }

  /**
   * Throws an error if the given {@link PipelineUser} does not have
   * access to the given {@link Pipeline}.
   */
  private ensureUserHasPipelineDefinitionAccess(
    user: PipelineUser | undefined,
    pipeline: PipelineDefinition | undefined
  ): void {
    if (!pipeline) {
      throw new Error(`can't view undefined pipeline`);
    }

    const hasAccess = this.userHasPipelineDefinitionAccess(user, pipeline);
    if (!hasAccess) {
      throw new Error(`user ${user?.id} can not view pipeline ${pipeline?.id}`);
    }
  }

  /**
   * Loads a pipeline definition if the given {@link PipelineUser} has access.
   */
  public async loadPipelineDefinition(
    userId: string,
    pipelineId: string
  ): Promise<PipelineDefinition> {
    return traced(SERVICE_NAME, "loadPipelineDefinition", async (span) => {
      logger(SERVICE_NAME, "loadPipelineDefinition", userId, pipelineId);
      span?.setAttribute("user_id", userId);
      span?.setAttribute("pipelineId", pipelineId);
      const pipeline = await this.definitionDB.getDefinition(pipelineId);
      const user = await this.userDB.getUser(userId);
      if (!pipeline || !this.userHasPipelineDefinitionAccess(user, pipeline))
        throw new PCDHTTPError(404, "Pipeline not found or not accessible");

      return pipeline;
    });
  }

  public async upsertPipelineDefinition(
    userId: string,
    pipelineDefinition: PipelineDefinition
  ): Promise<PipelineDefinition> {
    return traced(SERVICE_NAME, "upsertPipelineDefinition", async (span) => {
      logger(
        SERVICE_NAME,
        "upsertPipelineDefinition",
        userId,
        str(pipelineDefinition)
      );
      span?.setAttribute("user_id", userId);
      span?.setAttribute("pipeline_id", pipelineDefinition.id);
      span?.setAttribute("pipeline_type", pipelineDefinition.type);

      const existingPipelineDefinition = await this.definitionDB.getDefinition(
        pipelineDefinition.id
      );
      const user = await this.userDB.getUser(userId);

      if (existingPipelineDefinition) {
        if (
          !this.userHasPipelineDefinitionAccess(
            user,
            existingPipelineDefinition
          )
        ) {
          throw new PCDHTTPError(403, "Not allowed to edit pipeline");
        }
        if (
          existingPipelineDefinition.ownerUserId !==
          pipelineDefinition.ownerUserId
        ) {
          throw new PCDHTTPError(400, "Cannot change owner of pipeline");
        }
      } else {
        pipelineDefinition.ownerUserId = userId;
        if (!pipelineDefinition.id) {
          pipelineDefinition.id = uuidV4();
        }
      }

      let newPipelineDefinition: PipelineDefinition;
      try {
        newPipelineDefinition = PipelineDefinitionSchema.parse(
          pipelineDefinition
        ) as PipelineDefinition;
      } catch (e) {
        throw new PCDHTTPError(400, `Invalid formatted response: ${e}`);
      }

      logger(
        LOG_TAG,
        `executing upsert of pipeline ${newPipelineDefinition.id}`
      );
      await this.definitionDB.setDefinition(newPipelineDefinition);
      await this.definitionDB.saveLastRunInfo(
        newPipelineDefinition.id,
        undefined
      );
      await this.atomDB.clear(newPipelineDefinition.id);
      this.restartPipeline(newPipelineDefinition.id);
      return newPipelineDefinition;
    });
  }

  public async deletePipelineDefinition(
    userId: string,
    pipelineId: string
  ): Promise<void> {
    return traced(SERVICE_NAME, "deletePipelineDefinition", async (span) => {
      span?.setAttribute("user_id", userId);
      span?.setAttribute("pipeline_id", pipelineId);
      const pipeline = await this.loadPipelineDefinition(userId, pipelineId);
      // TODO: Finalize the "permissions model" for CRUD actions. Right now,
      // create, read, update are permissable by owners and editors, while delete
      // is only permissable by owners.
      if (pipeline.ownerUserId !== userId) {
        throw new PCDHTTPError(
          403,
          `user ${userId} can't delete pipeline ${pipeline.id} owned by other user ${pipeline.ownerUserId}`
        );
      }

      await this.definitionDB.clearDefinition(pipelineId);
      await this.definitionDB.saveLastRunInfo(pipelineId, undefined);
      await this.atomDB.clear(pipelineId);
      await this.restartPipeline(pipelineId);
    });
  }

  /**
   * Makes sure that the pipeline that's running on the server
   * for the given id is based off the latest pipeline configuration
   * stored in the database.
   *
   * If a pipeline with the given definition does not exist in the database
   * makes sure that no pipeline for it is running on the server.
   *
   * Tl;dr syncs db <-> pipeline in memory
   */
  private async restartPipeline(pipelineId: string): Promise<void> {
    return traced(SERVICE_NAME, "restartPipeline", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);
      const pipelineSlot = this.pipelineSlots.find(
        (p) => p.definition.id === pipelineId
      );
      span?.setAttribute("has_slot", !!pipelineSlot);

      if (pipelineSlot) {
        // we're going to need to stop the pipeline for this
        // definition, so we do that right at the beginning
        this.pipelineSlots = this.pipelineSlots.filter(
          (p) => p.definition.id !== pipelineId
        );
        logger(
          LOG_TAG,
          `killing already running pipeline instance '${pipelineId}'`
        );
        await pipelineSlot.pipelineInstance?.stop();
      } else {
        logger(LOG_TAG, `starting brand new pipeline ${pipelineId}`);
      }

      const pipelineDefinition =
        await this.definitionDB.getDefinition(pipelineId);

      if (!pipelineDefinition) {
        logger(
          LOG_TAG,
          `can't restart pipeline '${pipelineId}' because not in database`
        );
        return;
      }

      logger(LOG_TAG, `instantiating pipeline ${pipelineId}`);

      const pipelineInstance = await instantiatePipeline(
        this.eddsaPrivateKey,
        pipelineDefinition,
        this.atomDB,
        {
          genericPretixAPI: this.genericPretixAPI,
          lemonadeAPI: this.lemonadeAPI
        },
        this.zupassPublicKey
      );

      const newPipelineSlot = {
        pipelineInstance: pipelineInstance,
        definition: pipelineDefinition
      } satisfies PipelineSlot;

      this.pipelineSlots.push(newPipelineSlot);

      await this.executeSinglePipeline(newPipelineSlot);
    });
  }

  public async createOrGetUser(email: string): Promise<PipelineUser> {
    return traced(SERVICE_NAME, "createOrGetUser", async (span) => {
      span?.setAttribute("email", email);

      const existingUser = await this.userDB.getUserByEmail(email);
      if (existingUser != null) {
        setFlattenedObject(span, { existingUser });
        return existingUser;
      }
      const newUser: PipelineUser = {
        id: uuidV4(),
        email,
        isAdmin: this.getEnvAdminEmails().includes(email)
      };
      this.userDB.setUser(newUser);
      setFlattenedObject(span, { newUser });
      return newUser;
    });
  }

  public async getAllPipelines(): Promise<Pipeline[]> {
    return this.pipelineSlots
      .map((p) => p.pipelineInstance)
      .filter((p) => !!p) as Pipeline[];
  }

  private getEmailFromStytchSession(session: Session): string {
    const email = session.authentication_factors.find(
      (f) => !!f.email_factor?.email_address
    )?.email_factor?.email_address;
    if (!email) {
      throw new PCDHTTPError(400, "Session did not use email authentication");
    }
    return email;
  }

  public async authenticateStytchSession(req: Request): Promise<PipelineUser> {
    try {
      const reqBody = req.body;
      const jwt = reqBody.jwt;
      const { session } = await this.stytchClient.sessions.authenticateJwt({
        session_jwt: jwt
      });
      const email = this.getEmailFromStytchSession(session);
      const user = await this.createOrGetUser(email);
      return user;
    } catch (e) {
      throw new PCDHTTPError(401, "Not authorized");
    }
  }

  public async sendLoginEmail(
    email: string
  ): Promise<GenericIssuanceSendEmailResponseValue> {
    return traced(SERVICE_NAME, "sendLoginEmail", async (span) => {
      const normalizedEmail = normalizeEmail(email);
      logger(LOG_TAG, "sendLoginEmail", normalizedEmail);
      span?.setAttribute("email", normalizedEmail);

      // TODO: Skip email auth on this.bypassEmail
      try {
        await this.stytchClient.magicLinks.email.loginOrCreate({
          email: normalizedEmail,
          login_magic_link_url: this.genericIssuanceClientUrl,
          login_expiration_minutes: 10,
          signup_magic_link_url: this.genericIssuanceClientUrl,
          signup_expiration_minutes: 10
        });
      } catch (e) {
        setError(e, span);
        logger(LOG_TAG, `failed to send login email to ${normalizeEmail}`, e);
        throw new PCDHTTPError(500, "Failed to send generic issuance email");
      }

      return undefined;
    });
  }

  private getEnvAdminEmails(): string[] {
    if (!process.env.GENERIC_ISSUANCE_ADMINS) {
      return [];
    }

    try {
      const adminEmailsFromEnv: string[] = JSON.parse(
        process.env.GENERIC_ISSUANCE_ADMINS
      );

      if (!(adminEmailsFromEnv instanceof Array)) {
        throw new Error(
          `expected environment variable 'GENERIC_ISSUANCE_ADMINS' ` +
            `to be an array of strings`
        );
      }

      return adminEmailsFromEnv;
    } catch (e) {
      return [];
    }
  }

  private async maybeSetupAdmins(): Promise<void> {
    try {
      const adminEmailsFromEnv = this.getEnvAdminEmails();
      logger(LOG_TAG, `setting up generic issuance admins`, adminEmailsFromEnv);
      for (const email of adminEmailsFromEnv) {
        await this.userDB.setUserAdmin(email, true);
      }
    } catch (e) {
      logger(LOG_TAG, `failed to set up generic issuance admins`, e);
    }
  }

  /**
   * in local development, set the `TEST_PRETIX_KEY` and `TEST_PRETIX_ORG_URL` env
   * variables to the ones that Ivan shares with you to set up a Pretix pipeline.
   */
  public async maybeInsertLocalDevTestPipeline(): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    logger("[INIT] attempting to create test pipeline data");

    const testPretixAPIKey = process.env.TEST_PRETIX_KEY;
    const testPretixOrgUrl = process.env.TEST_PRETIX_ORG_URL;
    const createTestPretixPipeline = process.env.CREATE_TEST_PIPELINE;

    if (!createTestPretixPipeline || !testPretixAPIKey || !testPretixOrgUrl) {
      logger("[INIT] not creating test pipeline data - missing env vars");
      return;
    }

    const existingPipelines = await this.definitionDB.loadPipelineDefinitions();
    if (existingPipelines.length !== 0) {
      logger("[INIT] there's already a pipeline - not creating test pipeline");
      return;
    }

    const ownerUUID = randomUUID();

    await sqlQuery(
      this.context.dbPool,
      "INSERT INTO generic_issuance_users VALUES($1, $2, $3)",
      [ownerUUID, "test@example.com", true]
    );

    const pretixDefinitionId = "3d6d4c8e-4228-423e-9b0a-33709aa1b468";

    const pretixDefinition: PretixPipelineDefinition = {
      ownerUserId: ownerUUID,
      id: pretixDefinitionId,
      timeCreated: new Date().toISOString(),
      timeUpdated: new Date().toISOString(),
      editorUserIds: [],
      options: {
        feedOptions: {
          feedDescription: "progcrypto test tickets",
          feedDisplayName: "progcrypto",
          feedFolder: "generic/progcrypto",
          feedId: "0"
        },
        events: [
          {
            genericIssuanceId: randomUUID(),
            externalId: "progcrypto",
            name: "ProgCrypto (Internal Test)",
            products: [
              {
                externalId: "369803",
                name: "GA",
                genericIssuanceId: randomUUID(),
                isSuperUser: false
              },
              {
                externalId: "374045",
                name: "Organizer",
                genericIssuanceId: randomUUID(),
                isSuperUser: true
              }
            ]
          }
        ],
        pretixAPIKey: testPretixAPIKey,
        pretixOrgUrl: testPretixOrgUrl
      },
      type: PipelineType.Pretix
    };

    await this.definitionDB.setDefinition(pretixDefinition);
  }
}

export async function startGenericIssuanceService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  lemonadeAPI: ILemonadeAPI | null,
  genericPretixAPI: IGenericPretixAPI | null
): Promise<GenericIssuanceService | null> {
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

  const projectIdEnv = process.env.STYTCH_PROJECT_ID;
  if (projectIdEnv == null) {
    logger("[INIT] missing environment variable STYTCH_PROJECT_ID");
    return null;
  }

  const secretEnv = process.env.STYTCH_SECRET;
  if (secretEnv == null) {
    logger("[INIT] missing environment variable STYTCH_SECRET");
    return null;
  }

  const stytchClient = new stytch.Client({
    project_id: projectIdEnv,
    secret: secretEnv
  });

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
    zupassPublicKey
  );

  issuanceService.start();

  return issuanceService;
}
