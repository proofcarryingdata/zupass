import {
  PipelineDefinition,
  PipelineLoadSummary
} from "@pcd/passport-interface";
import { RollbarService } from "@pcd/server-shared";
import { str } from "@pcd/util";
import { PoolClient } from "postgres-pool";
import {
  namedSqlTransaction,
  sqlTransaction
} from "../../../database/sqlQuery";
import { ApplicationContext } from "../../../types";
import { logger } from "../../../util/logger";
import { DiscordService } from "../../discordService";
import { PagerDutyService } from "../../pagerDutyService";
import { setError, traced } from "../../telemetryService";
import { tracePipeline, traceUser } from "../honeycombQueries";
import { Pipeline } from "../pipelines/types";
import { PipelineSlot } from "../types";
import { PipelineSubservice } from "./PipelineSubservice";
import { UserSubservice } from "./UserSubservice";
import {
  InstantiatePipelineArgs,
  instantiatePipeline
} from "./utils/instantiatePipeline";
import { performPipelineLoad } from "./utils/performPipelineLoad";

const SERVICE_NAME = "GI_PIPELINE_EXECUTOR_SUBSERVICE";
const LOG_TAG = `[${SERVICE_NAME}]`;

/**
 * Encapsulates Podbox' Pipeline functionality, specifically scheduling their
 * execution, and representing the server's understanding of each Pipeline's
 * state.
 */
export class PipelineExecutorSubservice {
  /**
   * The pipeline data reload algorithm works as follows:
   * 1. concurrently load all data for all pipelines
   * 2. save that data, represented by {@link PipelineAtom}, and a corresponding
   *    {@link PipelineLoadSummary}, which contains information about that particular
   *    data load.
   * 3. wait {@link PIPELINE_REFRESH_INTERVAL_MS} milliseconds
   * 4. go back to step one
   */
  private static readonly PIPELINE_REFRESH_INTERVAL_MS = 60_000;

  /**
   * Podbox maintains an instance of a {@link PipelineSlot} for each pipeline
   * definition stored in the database.
   */
  private pipelineSlots: PipelineSlot[];

  private context: ApplicationContext;
  private pipelineSubservice: PipelineSubservice;
  private userSubservice: UserSubservice;
  private instantiatePipelineArgs: InstantiatePipelineArgs;
  private pagerdutyService: PagerDutyService | null;
  private discordService: DiscordService | null;
  private rollbarService: RollbarService | null;
  private nextLoadTimeout: NodeJS.Timeout | undefined;

  public constructor(
    pipelineSubservice: PipelineSubservice,
    context: ApplicationContext,
    userSubservice: UserSubservice,
    pagerdutyService: PagerDutyService | null,
    discordService: DiscordService | null,
    rollbarService: RollbarService | null,
    instantiatePipelineArgs: InstantiatePipelineArgs
  ) {
    this.pipelineSlots = [];
    this.pagerdutyService = pagerdutyService;
    this.discordService = discordService;
    this.rollbarService = rollbarService;
    this.userSubservice = userSubservice;
    this.pipelineSubservice = pipelineSubservice;
    this.instantiatePipelineArgs = instantiatePipelineArgs;
    this.context = context;
  }

  /**
   * Instantiates a {@link PipelineSlot} for each {@link PipelineDefinition} stored
   * in the database. Loads each pipeline's data. Unless @param startLoadLoop is `false`,
   * schedules a load loop which loads data for each {@link Pipeline} once per minute.
   */
  public async start(startLoadLoop?: boolean): Promise<void> {
    await sqlTransaction(this.context.dbPool, (client) =>
      this.loadAndInstantiatePipelines(client)
    );

    if (startLoadLoop !== false) {
      await this.startPipelineLoadLoop();
    } else {
      await this.performAllPipelineLoads();
    }
  }

  /**
   * If there's a load loop scheduled, cancels it.
   */
  public async stop(): Promise<void> {
    if (this.nextLoadTimeout) {
      clearTimeout(this.nextLoadTimeout);
      this.nextLoadTimeout = undefined;
    }
  }

  /**
   * @throws if there's no instantiated {@link PipelineSlot} for the @param id.
   * The server maintains one slot per pipeline in the definition DB. if a user
   * deletes a pipeline, the corresponding slot is removed from the total set of
   * slots.
   */
  public async ensurePipelineSlotExists(id: string): Promise<PipelineSlot> {
    const pipeline = await this.pipelineSubservice.getPipelineSlot(id);
    if (!pipeline) {
      throw new Error(`no pipeline with id ${id} found`);
    }
    return pipeline;
  }

  /**
   * @throws if there's no {@link PipelineSlot} for the given @param id, or if
   * the {@link Pipeline} could not be instantiated via {@link instantiatePipeline}.
   */
  public async ensurePipelineStarted(id: string): Promise<Pipeline> {
    const pipeline = await this.ensurePipelineSlotExists(id);
    if (!pipeline.instance) {
      throw new Error(`no pipeline instance with id ${id} found`);
    }
    return pipeline.instance;
  }

  /**
   * Makes sure that the pipeline that's running on the server
   * for the given id is based off the latest pipeline configuration
   * stored in the database.
   *
   * If a pipeline with the given definition does not exist in the database
   * makes sure that no pipeline for it is running on the server.
   *
   * tl;dr syncs db <-> pipeline in memory representation
   */
  public async restartPipeline(
    client: PoolClient,
    pipelineId: string,
    dontLoad?: boolean
  ): Promise<void> {
    return traced(SERVICE_NAME, "restartPipeline", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);
      const definition = await this.pipelineSubservice.loadPipelineDefinition(
        client,
        pipelineId
      );
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
          owner: await this.userSubservice.getUserById(
            client,
            definition.ownerUserId
          )
        };
        this.pipelineSlots.push(pipelineSlot);
      } else {
        pipelineSlot.owner = await this.userSubservice.getUserById(
          client,
          definition.ownerUserId
        );
      }

      tracePipeline(pipelineSlot.definition);
      traceUser(pipelineSlot.owner);

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

      pipelineSlot.instance = await instantiatePipeline(
        this.context,
        definition,
        this.instantiatePipelineArgs
      );
      pipelineSlot.definition = definition;

      if (dontLoad !== true) {
        await this.performPipelineLoad(pipelineSlot);
      }
    });
  }

  public getAllPipelineSlots(): PipelineSlot[] {
    return this.pipelineSlots;
  }

  /**
   * - loads all {@link PipelineDefinition}s from persistent storage
   * - creates a {@link PipelineSlot} for each definition
   * - attempts to instantiate the corresponding {@link Pipeline} for each definition,
   *   according to that pipeline's {@link PipelineType}. Currently implemented pipeline
   *   types include:
   *     - {@link LemonadePipeline}
   *     - {@link PretixPipeline}
   *     - {@link CSVPipeline}
   */
  private async loadAndInstantiatePipelines(client: PoolClient): Promise<void> {
    return traced(SERVICE_NAME, "loadAndInstantiatePipelines", async (span) => {
      const pipelinesFromDB =
        await this.pipelineSubservice.loadPipelineDefinitions(client);
      span?.setAttribute("pipeline_count", pipelinesFromDB.length);

      await Promise.allSettled(
        this.pipelineSlots.map(async (entry) => {
          if (entry.instance) {
            await entry.instance.stop();
          }
        })
      );

      this.pipelineSlots = await Promise.all(
        pipelinesFromDB.map(async (pipelineDefinition: PipelineDefinition) => {
          const slot: PipelineSlot = {
            definition: pipelineDefinition,
            owner: await this.userSubservice.getUserById(
              client,
              pipelineDefinition.ownerUserId
            )
          };

          // attempt to instantiate a {@link Pipeline}
          // for this slot. no worries in case of error -
          // log and continue
          try {
            slot.instance = await instantiatePipeline(
              this.context,
              pipelineDefinition,
              this.instantiatePipelineArgs
            );
          } catch (e) {
            this.rollbarService?.reportError(e);
            logger(
              LOG_TAG,
              `failed to instantiate pipeline ${pipelineDefinition.id} `,
              e
            );
          }

          return slot;
        })
      );
    });
  }

  /**
   * All {@link Pipeline}s load data from some data source. This function
   * executes the load for the given {@link PipelineSlot}.
   */
  public async performPipelineLoad(
    pipelineSlot: PipelineSlot
  ): Promise<PipelineLoadSummary> {
    return traced<PipelineLoadSummary>(
      SERVICE_NAME,
      "performPipelineLoad",
      async (): Promise<PipelineLoadSummary> => {
        return performPipelineLoad(
          this.context.dbPool,
          pipelineSlot,
          this.pipelineSubservice,
          this.userSubservice,
          this.discordService,
          this.pagerdutyService,
          this.rollbarService
        );
      }
    );
  }

  /**
   * Iterates over all instantiated {@link PipelineSlot}s and attempts to
   * perform a load for each one. No individual pipeline load failure prevents
   * any other load from succeeding. Resolves when all pipelines complete
   * loading.
   *
   * @note This means that a single pipeline whose load function takes
   * a long time could stall the system.
   *
   * @todo: be robust to stalling. one way to do this could be to race the
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
          try {
            const runInfo = await this.performPipelineLoad(slot);
            await sqlTransaction(this.context.dbPool, (client) =>
              this.pipelineSubservice.saveLoadSummary(
                client,
                slot.definition.id,
                runInfo
              )
            );
          } catch (e) {
            logger(
              LOG_TAG,
              `failed to perform pipeline load for pipeline ${slot.definition.id}`,
              e
            );
          }
        })
      );
    });
  }

  /**
   * Loads all data for all pipelines (that have been started). Waits 60s,
   * then loads all data for all loaded pipelines again.
   */
  private async startPipelineLoadLoop(): Promise<void> {
    try {
      // for each running pipeline, call its 'load' function
      await this.performAllPipelineLoads();
    } catch (e) {
      setError(e);
      this.rollbarService?.reportError(e);
      logger(LOG_TAG, "pipeline datas failed to refresh", e);
    }

    logger(
      LOG_TAG,
      "scheduling next pipeline refresh for",
      Math.floor(
        PipelineExecutorSubservice.PIPELINE_REFRESH_INTERVAL_MS / 1000
      ),
      "s from now"
    );

    // for each pipeline slot, reload its definition from the database,
    // and re-instantiate the pipeline. do NOT call the pipeline's 'load'
    // function - that will be done the next time `startPipelineLoadLoop`
    // is called.
    await namedSqlTransaction(
      this.context.dbPool,
      "startPipelineLoadLoop",
      async (client) => {
        await this.loadAndInstantiatePipelines(client);
        await Promise.allSettled(
          this.pipelineSlots
            .slice()
            .map((s) => this.restartPipeline(client, s.definition.id, true))
        );
      }
    );

    this.nextLoadTimeout = setTimeout(() => {
      this.startPipelineLoadLoop();
    }, PipelineExecutorSubservice.PIPELINE_REFRESH_INTERVAL_MS);
  }
}
