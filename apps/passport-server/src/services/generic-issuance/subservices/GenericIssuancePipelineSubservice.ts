import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  GenericIssuancePipelineListEntry,
  PipelineDefinition,
  PipelineDefinitionSchema,
  PipelineLoadSummary,
  isCSVPipelineDefinition
} from "@pcd/passport-interface";
import { str } from "@pcd/util";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import { ILemonadeAPI } from "../../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../../apis/pretix/genericPretixAPI";
import { IPipelineAtomDB } from "../../../database/queries/pipelineAtomDB";
import { IPipelineCheckinDB } from "../../../database/queries/pipelineCheckinDB";
import { IPipelineConsumerDB } from "../../../database/queries/pipelineConsumerDB";
import {
  IPipelineDefinitionDB,
  PipelineDefinitionDB
} from "../../../database/queries/pipelineDefinitionDB";
import { IPipelineSemaphoreHistoryDB } from "../../../database/queries/pipelineSemaphoreHistoryDB";
import { IPipelineUserDB } from "../../../database/queries/pipelineUserDB";
import {
  IBadgeGiftingDB,
  IContactSharingDB
} from "../../../database/queries/ticketActionDBs";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { ApplicationContext } from "../../../types";
import { logger } from "../../../util/logger";
import { DiscordService } from "../../discordService";
import { PagerDutyService } from "../../pagerDutyService";
import { PersistentCacheService } from "../../persistentCacheService";
import { RollbarService } from "../../rollbarService";
import { traced } from "../../telemetryService";
import { tracePipeline, traceUser } from "../honeycombQueries";
import { instantiatePipeline } from "../pipelines/instantiatePipeline";
import { Pipeline, PipelineUser } from "../pipelines/types";
import { PipelineSlot } from "../types";
import { GenericIssuancePipelineExecutorSubservice } from "./GenericIssuancePipelineExecutorSubservice";

const SERVICE_NAME = "GENERIC_ISSUANCE_PIPELINE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export class GenericIssuancePipelineSubservice {
  private static readonly DISCORD_ALERT_TIMEOUT_MS = 60_000 * 10;

  /**
   * The pipeline data reload algorithm works as follows:
   * 1. concurrently load all data for all pipelines
   * 2. save that data
   * 3. wait {@link PIPELINE_REFRESH_INTERVAL_MS} milliseconds
   * 4. go back to step one
   */
  private static readonly PIPELINE_REFRESH_INTERVAL_MS = 60_000;

  private pipelineSlots: PipelineSlot[];
  private eddsaPrivateKey: string;
  private definitionDB: IPipelineDefinitionDB;
  private userDB: IPipelineUserDB;
  private atomDB: IPipelineAtomDB;
  private rsaPrivateKey: string;
  private zupassPublicKey: EdDSAPublicKey;
  private cacheService: PersistentCacheService;
  private checkinDB: IPipelineCheckinDB;
  private contactDB: IContactSharingDB;
  private lemonadeAPI: ILemonadeAPI;
  private genericPretixAPI: IGenericPretixAPI;
  private badgeDB: IBadgeGiftingDB;
  private consumerDB: IPipelineConsumerDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private nextLoadTimeout: NodeJS.Timeout | undefined;
  private stopped: boolean;

  private pipelineExecutorSubservice: GenericIssuancePipelineExecutorSubservice;

  public constructor(
    context: ApplicationContext,

    eddsaPrivateKey: string,
    zupassPublicKey: EdDSAPublicKey,
    rsaPrivateKey: string,

    userDB: IPipelineUserDB,
    atomDB: IPipelineAtomDB,
    checkinDB: IPipelineCheckinDB,
    contactDB: IContactSharingDB,
    badgeDB: IBadgeGiftingDB,
    consumerDB: IPipelineConsumerDB,
    semaphoreHistoryDB: IPipelineSemaphoreHistoryDB,

    cacheService: PersistentCacheService,
    pagerdutyService: PagerDutyService | null,
    discordService: DiscordService | null,
    rollbarService: RollbarService | null,

    lemonadeAPI: ILemonadeAPI,
    genericPretixAPI: IGenericPretixAPI
  ) {
    this.definitionDB = new PipelineDefinitionDB(context.dbPool);
    this.pipelineSlots = [];
    this.atomDB = atomDB;
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.rsaPrivateKey = rsaPrivateKey;
    this.zupassPublicKey = zupassPublicKey;
    this.cacheService = cacheService;
    this.checkinDB = checkinDB;
    this.contactDB = contactDB;
    this.lemonadeAPI = lemonadeAPI;
    this.genericPretixAPI = genericPretixAPI;
    this.badgeDB = badgeDB;
    this.consumerDB = consumerDB;
    this.semaphoreHistoryDB = semaphoreHistoryDB;
    this.stopped = false;

    this.pipelineExecutorSubservice =
      new GenericIssuancePipelineExecutorSubservice(
        context,
        eddsaPrivateKey,
        zupassPublicKey,
        rsaPrivateKey,

        userDB,
        atomDB,
        checkinDB,
        contactDB,
        badgeDB,
        consumerDB,
        semaphoreHistoryDB,

        cacheService,
        pagerdutyService,
        discordService,
        rollbarService,

        this,

        lemonadeAPI,
        genericPretixAPI
      );

    this.userDB = userDB;
  }

  public async start(startLoadLoop?: boolean): Promise<void> {
    await this.pipelineExecutorSubservice.start(startLoadLoop);
  }

  public async stop(): Promise<void> {
    this.stopped = true;
    if (this.nextLoadTimeout) {
      clearTimeout(this.nextLoadTimeout);
      this.nextLoadTimeout = undefined;
    }
  }

  public async getAllPipelineInstances(): Promise<Pipeline[]> {
    return this.pipelineSlots
      .map((p) => p.instance)
      .filter((p) => !!p) as Pipeline[];
  }

  public async getPipelineSlot(id: string): Promise<PipelineSlot | undefined> {
    return this.pipelineSlots.find((p) => p.definition.id === id);
  }

  public async ensurePipelineSlotExists(id: string): Promise<PipelineSlot> {
    const pipeline = await this.getPipelineSlot(id);
    if (!pipeline) {
      throw new Error(`no pipeline with id ${id} found`);
    }
    return pipeline;
  }

  public async ensurePipelineStarted(id: string): Promise<Pipeline> {
    const pipeline = await this.ensurePipelineSlotExists(id);
    if (!pipeline.instance) {
      throw new Error(`no pipeline instance with id ${id} found`);
    }
    return pipeline.instance;
  }

  public async getLastLoadSummary(
    id: string
  ): Promise<PipelineLoadSummary | undefined> {
    return this.definitionDB.getLastLoadSummary(id);
  }

  public async loadPipelineDefinition(
    id: string
  ): Promise<PipelineDefinition | undefined> {
    return this.definitionDB.getDefinition(id);
  }

  public async saveDefinition(definition: PipelineDefinition): Promise<void> {
    await this.definitionDB.setDefinition(definition);
  }

  public async deletePipelineDefinition(
    user: PipelineUser,
    pipelineId: string
  ): Promise<void> {
    return traced(SERVICE_NAME, "deletePipelineDefinition", async (span) => {
      traceUser(user);

      span?.setAttribute("pipeline_id", pipelineId);
      const pipeline = await this.loadPipelineDefinition(pipelineId);

      if (!pipeline) {
        throw new PCDHTTPError(404);
      }

      tracePipeline(pipeline);

      // TODO: Finalize the "permissions model" for CRUD actions. Right now,
      // create, read, update are permissable by owners and editors, while delete
      // is only permissable by owners.
      if (pipeline.ownerUserId !== user.id && !user.isAdmin) {
        throw new PCDHTTPError(
          403,
          `user '${str(user)}' can't delete pipeline '${
            pipeline.id
          }' owned by other user ${pipeline.ownerUserId}`
        );
      }

      await this.definitionDB.clearDefinition(pipelineId);
      await this.definitionDB.saveLoadSummary(pipelineId, undefined);
      await this.atomDB.clear(pipelineId);
      await this.restartPipeline(pipelineId);
    });
  }

  public async upsertPipelineDefinition(
    user: PipelineUser,
    newDefinition: PipelineDefinition
  ): Promise<{
    definition: PipelineDefinition;
    restartPromise: Promise<void>;
  }> {
    return traced(SERVICE_NAME, "upsertPipelineDefinition", async (span) => {
      logger(SERVICE_NAME, "upsertPipelineDefinition", str(newDefinition));
      traceUser(user);

      // TODO: do this in a transaction
      const existingPipelineDefinition = await this.loadPipelineDefinition(
        newDefinition.id
      );
      const existingSlot = this.pipelineSlots.find(
        (slot) => slot.definition.id === existingPipelineDefinition?.id
      );

      if (existingPipelineDefinition) {
        span?.setAttribute("is_new", false);
        this.ensureUserHasPipelineDefinitionAccess(
          user,
          existingPipelineDefinition
        );
        if (
          existingPipelineDefinition.ownerUserId !==
            newDefinition.ownerUserId &&
          !user.isAdmin
        ) {
          throw new PCDHTTPError(400, "Cannot change owner of pipeline");
        }

        if (
          !user.isAdmin &&
          !_.isEqual(
            existingPipelineDefinition.options.alerts,
            newDefinition.options.alerts
          )
        ) {
          throw new PCDHTTPError(400, "Cannot change alerts of pipeline");
        }
      } else {
        // NEW PIPELINE!
        span?.setAttribute("is_new", true);
        newDefinition.ownerUserId = user.id;
        newDefinition.id = uuidv4();
        newDefinition.timeCreated = new Date().toISOString();
        newDefinition.timeUpdated = new Date().toISOString();

        if (!user.isAdmin && !!newDefinition.options.alerts) {
          throw new PCDHTTPError(400, "Cannot create pipeline with alerts");
        }
      }

      let validatedNewDefinition: PipelineDefinition = newDefinition;

      try {
        validatedNewDefinition = PipelineDefinitionSchema.parse(
          newDefinition
        ) as PipelineDefinition;
      } catch (e) {
        logger(LOG_TAG, "invalid pipeline definition", e);
        throw new PCDHTTPError(400, `Invalid Pipeline Definition: ${e}`);
      }

      if (isCSVPipelineDefinition(validatedNewDefinition)) {
        if (validatedNewDefinition.options.csv.length > 80_000) {
          throw new Error("csv too large");
        }
      }

      logger(
        LOG_TAG,
        `executing upsert of pipeline ${str(validatedNewDefinition)}`
      );
      tracePipeline(validatedNewDefinition);
      await this.saveDefinition(validatedNewDefinition);
      if (existingSlot) {
        existingSlot.owner = await this.userDB.getUserById(
          validatedNewDefinition.ownerUserId
        );
      }
      await this.saveLoadSummary(validatedNewDefinition.id, undefined);
      await this.atomDB.clear(validatedNewDefinition.id);
      // purposely not awaited
      const restartPromise = this.restartPipeline(validatedNewDefinition.id);
      return { definition: validatedNewDefinition, restartPromise };
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

        const visiblePipelines = this.pipelineSlots.filter((slot) =>
          this.userHasPipelineDefinitionAccess(user, slot.definition)
        );
        span?.setAttribute("pipeline_count", visiblePipelines.length);

        return Promise.all(
          visiblePipelines.map(async (slot) => {
            const owner = slot.owner;
            const summary = await this.getLastLoadSummary(slot.definition.id);
            return {
              extraInfo: {
                ownerEmail: owner?.email,
                lastLoad: summary
              },
              pipeline: slot.definition
            } satisfies GenericIssuancePipelineListEntry;
          })
        );
      }
    );
  }

  /**
   * Loads a pipeline definition if the given {@link PipelineUser} has access.
   */
  public async loadPipelineDefinitionForUser(
    user: PipelineUser,
    pipelineId: string
  ): Promise<PipelineDefinition> {
    return traced(SERVICE_NAME, "loadPipelineDefinition", async (span) => {
      logger(SERVICE_NAME, "loadPipelineDefinition", str(user), pipelineId);
      traceUser(user);
      const pipeline = await this.loadPipelineDefinition(pipelineId);
      tracePipeline(pipeline);
      if (!pipeline || !this.userHasPipelineDefinitionAccess(user, pipeline)) {
        throw new PCDHTTPError(404, "Pipeline not found or not accessible");
      }
      span?.setAttribute("pipeline_type", pipeline.type);
      return pipeline;
    });
  }

  /**
   * Throws an error if the given {@link PipelineUser} does not have
   * access to the given {@link Pipeline}.
   */
  public ensureUserHasPipelineDefinitionAccess(
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
      const definition = await this.loadPipelineDefinition(pipelineId);
      if (!definition) {
        logger(
          LOG_TAG,
          `can't restart pipeline with id ${pipelineId} - doesn't exist in database`
        );
        this.pipelineSlots = this.pipelineSlots.filter(
          (slot) => slot.definition.id !== pipelineId
        );
        return;
      }

      let pipelineSlot = this.pipelineSlots.find(
        (s) => s.definition.id === pipelineId
      );
      span?.setAttribute("slot_existed", !!pipelineSlot);

      if (!pipelineSlot) {
        pipelineSlot = {
          definition: definition,
          owner: await this.userDB.getUserById(definition.ownerUserId)
        };
        this.pipelineSlots.push(pipelineSlot);
      } else {
        pipelineSlot.owner = await this.userDB.getUserById(
          definition.ownerUserId
        );
      }

      tracePipeline(pipelineSlot.definition);
      traceUser(pipelineSlot?.owner);

      if (pipelineSlot.instance) {
        logger(
          LOG_TAG,
          `killing already running pipeline instance '${pipelineId}'`
        );
        span?.setAttribute("stopping", true);
        await pipelineSlot.instance.stop();
      } else {
        logger(
          LOG_TAG,
          `no need to kill existing pipeline - none exists '${pipelineId}'`
        );
      }

      logger(LOG_TAG, `instantiating pipeline ${pipelineId}`);

      pipelineSlot.definition = definition;
      pipelineSlot.instance = await instantiatePipeline(
        this.eddsaPrivateKey,
        definition,
        this.atomDB,
        {
          genericPretixAPI: this.genericPretixAPI,
          lemonadeAPI: this.lemonadeAPI
        },
        this.zupassPublicKey,
        this.rsaPrivateKey,
        this.cacheService,
        this.checkinDB,
        this.contactDB,
        this.badgeDB,
        this.consumerDB,
        this.semaphoreHistoryDB
      );

      await this.pipelineExecutorSubservice.performPipelineLoad(pipelineSlot);
    });
  }

  public async saveLoadSummary(
    id: string,
    summary: PipelineLoadSummary | undefined
  ): Promise<void> {
    await this.definitionDB.saveLoadSummary(id, summary);
  }

  public getAllPipelines(): PipelineSlot[] {
    return this.pipelineSlots;
  }
}
