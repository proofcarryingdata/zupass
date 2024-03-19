import {
  PipelineDefinition,
  PipelineLoadSummary
} from "@pcd/passport-interface";
import { str } from "@pcd/util";
import { logger } from "../../../util/logger";
import { DiscordService } from "../../discordService";
import { PagerDutyService } from "../../pagerDutyService";
import { RollbarService } from "../../rollbarService";
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

const SERVICE_NAME = "GENERIC_ISSUANCE_PIPELINE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export class PipelineExecutorSubservice {
  /**
   * The pipeline data reload algorithm works as follows:
   * 1. concurrently load all data for all pipelines
   * 2. save that data
   * 3. wait {@link PIPELINE_REFRESH_INTERVAL_MS} milliseconds
   * 4. go back to step one
   */
  private static readonly PIPELINE_REFRESH_INTERVAL_MS = 60_000;

  private pipelineSlots: PipelineSlot[];

  private pipelineSubservice: PipelineSubservice;
  private userSubservice: UserSubservice;

  private instantiatePipelineArgs: InstantiatePipelineArgs;
  private pagerdutyService: PagerDutyService | null;
  private discordService: DiscordService | null;
  private rollbarService: RollbarService | null;
  private nextLoadTimeout: NodeJS.Timeout | undefined;

  public constructor(
    pipelineSubservice: PipelineSubservice,
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
    if (this.nextLoadTimeout) {
      clearTimeout(this.nextLoadTimeout);
      this.nextLoadTimeout = undefined;
    }
  }

  public async ensurePipelineSlotExists(id: string): Promise<PipelineSlot> {
    const pipeline = await this.pipelineSubservice.getPipelineSlot(id);
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
  public async restartPipeline(pipelineId: string): Promise<void> {
    return traced(SERVICE_NAME, "restartPipeline", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);
      const definition =
        await this.pipelineSubservice.loadPipelineDefinition(pipelineId);
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
          owner: await this.userSubservice.getUserById(definition.ownerUserId)
        };
        this.pipelineSlots.push(pipelineSlot);
      } else {
        pipelineSlot.owner = await this.userSubservice.getUserById(
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
        definition,
        this.instantiatePipelineArgs
      );

      await this.performPipelineLoad(pipelineSlot);
    });
  }

  public getAllPipelineSlots(): PipelineSlot[] {
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
      const pipelinesFromDB =
        await this.pipelineSubservice.loadPipelineDefinitions();
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
              pipelineDefinition.ownerUserId
            )
          };

          // attempt to instantiate a {@link Pipeline}
          // for this slot. no worries in case of error -
          // log and continue
          try {
            slot.instance = await instantiatePipeline(
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
   * All {@link Pipeline}s load data somehow. That's a 'first-class'
   * capability.
   */
  public async performPipelineLoad(
    pipelineSlot: PipelineSlot
  ): Promise<PipelineLoadSummary> {
    return traced<PipelineLoadSummary>(
      SERVICE_NAME,
      "performPipelineLoad",
      async (): Promise<PipelineLoadSummary> => {
        return performPipelineLoad(
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
          await this.pipelineSubservice.saveLoadSummary(
            slot.definition.id,
            runInfo
          );
        })
      );
    });
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

    logger(
      LOG_TAG,
      "scheduling next pipeline refresh for",
      Math.floor(
        PipelineExecutorSubservice.PIPELINE_REFRESH_INTERVAL_MS / 1000
      ),
      "s from now"
    );
    span?.setAttribute(
      "timeout_ms",
      PipelineExecutorSubservice.PIPELINE_REFRESH_INTERVAL_MS
    );

    this.nextLoadTimeout = setTimeout(() => {
      this.startPipelineLoadLoop();
    }, PipelineExecutorSubservice.PIPELINE_REFRESH_INTERVAL_MS);
  }
}
