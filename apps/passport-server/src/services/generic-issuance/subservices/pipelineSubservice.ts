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
import urljoin from "url-join";
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
import { setError, traced } from "../../telemetryService";
import {
  traceLoadSummary,
  tracePipeline,
  traceUser
} from "../honeycombQueries";
import { instantiatePipeline } from "../pipelines/instantiatePipeline";
import { Pipeline, PipelineUser } from "../pipelines/types";
import { PipelineSlot } from "../types";
import {
  getErrorLogs,
  getWarningLogs,
  makePLogErr,
  makePLogInfo
} from "../util";

const SERVICE_NAME = "GENERIC_ISSUANCE_PIPELINE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export class PipelineSubservice {
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
  private pagerdutyService: PagerDutyService | null;
  private discordService: DiscordService | null;
  private rollbarService: RollbarService | null;
  private nextLoadTimeout: NodeJS.Timeout | undefined;
  private stopped = false;

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
    this.pagerdutyService = pagerdutyService;
    this.discordService = discordService;
    this.rollbarService = rollbarService;
    this.userDB = userDB;
  }

  public async start(startLoadLoop?: boolean): Promise<void> {
    await this.loadAndInstantiatePipelines();
    if (startLoadLoop !== false) {
      await this.startPipelineLoadLoop();
    } else {
      await this.performAllPipelineLoads();
    }
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

      await this.performPipelineLoad(pipelineSlot);
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

  /**
   * - loads all {@link PipelineDefinition}s from persistent storage
   * - creates a {@link PipelineSlot} for each definition
   * - attempts to instantiate the correct {@link Pipeline} for each definition,
   *   according to that pipeline's {@link PipelineType}. Currently implemented
   *   pipeline types include:
   *     - {@link LemonadePipeline}
   *     - {@link PretixPipeline}
   *     - {@link CSVPipeline}
   */
  private async loadAndInstantiatePipelines(): Promise<void> {
    return traced(SERVICE_NAME, "loadAndInstantiatePipelines", async (span) => {
      const pipelinesFromDB = await this.definitionDB.loadPipelineDefinitions();
      span?.setAttribute("pipeline_count", pipelinesFromDB.length);

      await Promise.allSettled(
        this.pipelineSlots.map(async (entry) => {
          if (entry.instance) {
            await entry.instance.stop();
          }
        })
      );

      this.pipelineSlots = await Promise.all(
        pipelinesFromDB.map(async (pd: PipelineDefinition) => {
          const slot: PipelineSlot = {
            definition: pd,
            owner: await this.userDB.getUserById(pd.ownerUserId)
          };

          // attempt to instantiate a {@link Pipeline}
          // for this slot. no worries in case of error -
          // log and continue
          try {
            slot.instance = await instantiatePipeline(
              this.eddsaPrivateKey,
              pd,
              this.atomDB,
              {
                lemonadeAPI: this.lemonadeAPI,
                genericPretixAPI: this.genericPretixAPI
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
          } catch (e) {
            this.rollbarService?.reportError(e);
            logger(LOG_TAG, `failed to instantiate pipeline ${pd.id} `, e);
          }

          return slot;
        })
      );
    });
  }

  /**
   * All {@link Pipeline}s load data somehow. That's a 'first-class'
   * capability.
   */
  private async performPipelineLoad(
    pipelineSlot: PipelineSlot
  ): Promise<PipelineLoadSummary> {
    return traced<PipelineLoadSummary>(
      SERVICE_NAME,
      "performPipelineLoad",
      async (span): Promise<PipelineLoadSummary> => {
        const startTime = new Date();
        const pipelineId = pipelineSlot.definition.id;
        const pipeline: Pipeline | undefined = pipelineSlot.instance;
        logger(
          LOG_TAG,
          `executing pipeline '${pipelineId}'` +
            ` of type '${pipeline?.type}'` +
            ` belonging to ${pipelineSlot.definition.ownerUserId}`
        );
        const owner = await this.userDB.getUserById(
          pipelineSlot.definition.ownerUserId
        );
        traceUser(owner);
        tracePipeline(pipelineSlot.definition);

        if (pipelineSlot.definition.options?.paused) {
          logger(
            LOG_TAG,
            `pipeline '${pipelineSlot.definition.id}' is paused, not loading`
          );
          const summary = {
            atomsLoaded: 0,
            lastRunEndTimestamp: new Date().toISOString(),
            lastRunStartTimestamp: new Date().toISOString(),
            latestLogs: [makePLogInfo("this pipeline is paused - not loading")],
            atomsExpected: 0,
            success: true
          };
          this.maybeAlertForPipelineRun(pipelineSlot, summary);
          return summary;
        }

        if (!pipeline) {
          logger(
            LOG_TAG,
            `pipeline '${pipelineId}' of type '${pipelineSlot.definition.type}'` +
              ` is not running; skipping execution`
          );
          const summary: PipelineLoadSummary = {
            lastRunStartTimestamp: startTime.toISOString(),
            lastRunEndTimestamp: new Date().toISOString(),
            latestLogs: [makePLogErr("failed to start pipeline")],
            atomsExpected: 0,
            atomsLoaded: 0,
            success: false,
            errorMessage: "failed to start pipeline"
          };
          this.definitionDB.saveLoadSummary(pipelineId, summary);
          traceLoadSummary(summary);
          this.maybeAlertForPipelineRun(pipelineSlot, summary);
          return summary;
        }

        try {
          logger(
            LOG_TAG,
            `loading data for pipeline with id '${pipelineId}'` +
              ` of type '${pipelineSlot.definition.type}'`
          );
          const summary = await pipeline.load();
          logger(
            LOG_TAG,
            `successfully loaded data for pipeline with id '${pipelineId}'` +
              ` of type '${pipelineSlot.definition.type}'`
          );
          this.definitionDB.saveLoadSummary(pipelineId, summary);
          traceLoadSummary(summary);
          this.maybeAlertForPipelineRun(pipelineSlot, summary);
          return summary;
        } catch (e) {
          this.rollbarService?.reportError(e);
          logger(LOG_TAG, `failed to load pipeline '${pipelineId}'`, e);
          setError(e, span);
          const summary = {
            lastRunStartTimestamp: startTime.toISOString(),
            lastRunEndTimestamp: new Date().toISOString(),
            latestLogs: [makePLogErr(`failed to load pipeline: ${e + ""}`)],
            atomsExpected: 0,
            atomsLoaded: 0,
            errorMessage: `failed to load pipeline\n${e}\n${
              e instanceof Error ? e.stack : ""
            }`,
            success: false
          } satisfies PipelineLoadSummary;
          this.definitionDB.saveLoadSummary(pipelineId, summary);
          traceLoadSummary(summary);
          this.maybeAlertForPipelineRun(pipelineSlot, summary);
          return summary;
        }
      }
    );
  }

  /**
   * Iterates over all instantiated {@link Pipeline}s and attempts to
   * perform a load for each one. No individual pipeline load failure should
   * prevent any other load from succeeding. Resolves when all pipelines complete
   * loading. This means that a single pipeline whose load function takes
   * a long time could stall the system.
   *
   * TODO: be robust to stalling. one way to do this could be to race the
   * load promise with a `sleep(30_000)`, and killing pipelines that take
   * longer than 30s.
   */
  private async performAllPipelineLoads(): Promise<void> {
    return traced(SERVICE_NAME, "performAllPipelineLoads", async (span) => {
      const pipelineIds = str(this.pipelineSlots.map((p) => p.definition.id));
      logger(
        LOG_TAG,
        `loading data for ${this.pipelineSlots.length} pipelines. ids are: ${pipelineIds}`
      );
      span?.setAttribute("pipeline_ids", pipelineIds);

      await Promise.allSettled(
        this.pipelineSlots.map(async (slot: PipelineSlot): Promise<void> => {
          const runInfo = await this.performPipelineLoad(slot);
          await this.definitionDB.saveLoadSummary(slot.definition.id, runInfo);
        })
      );
    });
  }

  /**
   * To be called after a pipeline finishes loading, either as part of the global
   * pipeline loading schedule, or because the pipeline's definition was updated.
   * Alerts the appropriate channels depending on the result of the pipeline load.
   *
   * Pipelines can be configured to opt in or out of alerts.
   */
  private async maybeAlertForPipelineRun(
    slot: PipelineSlot,
    runInfo: PipelineLoadSummary
  ): Promise<void> {
    const podboxUrl = process.env.GENERIC_ISSUANCE_CLIENT_URL ?? "";
    const pipelineDisplayName = slot?.definition.options?.name ?? "untitled";
    const errorLogs = getErrorLogs(
      runInfo.latestLogs,
      slot.definition.options.alerts?.errorLogIgnoreRegexes
    );
    const warningLogs = getWarningLogs(
      runInfo.latestLogs,
      slot.definition.options.alerts?.warningLogIgnoreRegexes
    );
    const discordTagList = slot.definition.options.alerts?.discordTags
      ? " " +
        slot.definition.options.alerts?.discordTags
          .map((id) => `<@${id}>`)
          .join(" ") +
        " "
      : "";

    const pipelineUrl = urljoin(
      podboxUrl,
      `/#/`,
      "pipelines",
      slot.definition.id
    );

    let shouldAlert = false;
    const alertReasons: string[] = [];

    if (!runInfo.success) {
      shouldAlert = true;
      alertReasons.push("pipeline load error");
    }

    if (
      errorLogs.length >= 1 &&
      slot.definition.options.alerts?.alertOnLogErrors
    ) {
      shouldAlert = true;
      alertReasons.push(
        `pipeline has error logs\n: ${JSON.stringify(errorLogs, null, 2)}`
      );
    }

    if (
      warningLogs.length >= 1 &&
      slot.definition.options.alerts?.alertOnLogWarnings
    ) {
      shouldAlert = true;
      alertReasons.push(
        `pipeline has warning logs\n ${JSON.stringify(warningLogs, null, 2)}`
      );
    }

    if (
      runInfo.atomsLoaded !== runInfo.atomsExpected &&
      slot.definition.options.alerts?.alertOnAtomMismatch
    ) {
      shouldAlert = true;
      alertReasons.push(
        `pipeline atoms count ${runInfo.atomsLoaded} mismatches data count ${runInfo.atomsExpected}`
      );
    }

    const alertReason = alertReasons.join("\n\n");

    // in the if - send alert beginnings
    if (shouldAlert) {
      // pagerduty
      if (
        slot.definition.options.alerts?.loadIncidentPagePolicy &&
        slot.definition.options.alerts?.pagerduty
      ) {
        const incident = await this.pagerdutyService?.triggerIncident(
          `pipeline load error: '${pipelineDisplayName}'`,
          `${pipelineUrl}\n${alertReason}`,
          slot.definition.options.alerts?.loadIncidentPagePolicy,
          `pipeline-load-error-` + slot.definition.id
        );
        if (incident) {
          slot.loadIncidentId = incident.id;
        }
      }

      // discord
      if (slot.definition.options.alerts?.discordAlerts) {
        let shouldMessageDiscord = false;
        if (
          // haven't messaged yet
          !slot.lastLoadDiscordMsgTimestamp ||
          // messaged too recently
          (slot.lastLoadDiscordMsgTimestamp &&
            Date.now() >
              slot.lastLoadDiscordMsgTimestamp.getTime() +
                PipelineSubservice.DISCORD_ALERT_TIMEOUT_MS)
        ) {
          slot.lastLoadDiscordMsgTimestamp = new Date();
          shouldMessageDiscord = true;
        }

        if (shouldMessageDiscord) {
          this?.discordService?.sendAlert(
            `🚨   [Podbox](${podboxUrl}) Alert${discordTagList}- Pipeline [\`${pipelineDisplayName}\`](${pipelineUrl}) failed to load 😵\n` +
              `\`\`\`\n${alertReason}\`\`\`\n` +
              (runInfo.errorMessage
                ? `\`\`\`\n${runInfo.errorMessage}\n\`\`\``
                : ``)
          );
        }
      }
    }
    // send alert resolutions
    else {
      if (slot.definition.options.alerts?.discordAlerts) {
        if (slot.lastLoadDiscordMsgTimestamp) {
          this?.discordService?.sendAlert(
            `✅   [Podbox](${podboxUrl}) Alert${discordTagList}- Pipeline [\`${pipelineDisplayName}\`](${pipelineUrl}) load error resolved`
          );
          slot.lastLoadDiscordMsgTimestamp = undefined;
        }
      }
      if (slot.loadIncidentId) {
        const incidentId = slot.loadIncidentId;
        slot.loadIncidentId = undefined;
        await this.pagerdutyService?.resolveIncident(incidentId);
      }
    }
  }

  /**
   * Loads all data for all pipelines (that have been started). Waits 60s,
   * then loads all data for all loaded pipelines again.
   */
  private async startPipelineLoadLoop(): Promise<void> {
    // return traced(SERVICE_NAME, "startPipelineLoadLoop", async (span) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const span: any = undefined;

    try {
      await this.performAllPipelineLoads();
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
      Math.floor(PipelineSubservice.PIPELINE_REFRESH_INTERVAL_MS / 1000),
      "s from now"
    );
    span?.setAttribute(
      "timeout_ms",
      PipelineSubservice.PIPELINE_REFRESH_INTERVAL_MS
    );

    this.nextLoadTimeout = setTimeout(() => {
      if (this.stopped) {
        return;
      }
      this.startPipelineLoadLoop();
    }, PipelineSubservice.PIPELINE_REFRESH_INTERVAL_MS);
  }
}
