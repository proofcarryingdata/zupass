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
import { IPipelineAtomDB } from "../../../database/queries/pipelineAtomDB";
import {
  IPipelineDefinitionDB,
  PipelineDefinitionDB
} from "../../../database/queries/pipelineDefinitionDB";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { ApplicationContext } from "../../../types";
import { logger } from "../../../util/logger";
import { DiscordService } from "../../discordService";
import { PagerDutyService } from "../../pagerDutyService";
import { RollbarService } from "../../rollbarService";
import { traced } from "../../telemetryService";
import { tracePipeline, traceUser } from "../honeycombQueries";
import { Pipeline, PipelineUser } from "../pipelines/types";
import { PipelineSlot } from "../types";
import { GenericIssuancePipelineExecutorSubservice } from "./GenericIssuancePipelineExecutorSubservice";
import { GenericIssuanceUserSubservice } from "./GenericIssuanceUserSubservice";
import { InstantiatePipelineArgs } from "./utils/instantiatePipeline";

const SERVICE_NAME = "GENERIC_ISSUANCE_PIPELINE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export class GenericIssuancePipelineSubservice {
  public pipelineSlots: PipelineSlot[];
  private userSubservice: GenericIssuanceUserSubservice;
  private pipelineDB: IPipelineDefinitionDB;
  private pipelineAtomDB: IPipelineAtomDB;
  private pipelineExecutorSubservice: GenericIssuancePipelineExecutorSubservice;

  public constructor(
    context: ApplicationContext,
    userSubservice: GenericIssuanceUserSubservice,
    pipelineAtomDB: IPipelineAtomDB,
    pagerdutyService: PagerDutyService | null,
    discordService: DiscordService | null,
    rollbarService: RollbarService | null,
    instantiatePipelineArgs: InstantiatePipelineArgs
  ) {
    this.pipelineDB = new PipelineDefinitionDB(context.dbPool);
    this.pipelineSlots = [];
    this.pipelineAtomDB = pipelineAtomDB;
    this.pipelineExecutorSubservice =
      new GenericIssuancePipelineExecutorSubservice(
        context,
        userSubservice,
        pagerdutyService,
        discordService,
        rollbarService,
        this,
        instantiatePipelineArgs
      );

    this.userSubservice = userSubservice;
  }

  public async start(startLoadLoop?: boolean): Promise<void> {
    await this.pipelineExecutorSubservice.start(startLoadLoop);
  }

  public async stop(): Promise<void> {
    await this.pipelineExecutorSubservice.stop();
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
    return this.pipelineDB.getLastLoadSummary(id);
  }

  public async loadPipelineDefinitions(): Promise<PipelineDefinition[]> {
    return this.pipelineDB.loadPipelineDefinitions();
  }

  public async loadPipelineDefinition(
    id: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineDB.getDefinition(id);
  }

  public async saveDefinition(definition: PipelineDefinition): Promise<void> {
    await this.pipelineDB.setDefinition(definition);
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

      if (pipeline.ownerUserId !== user.id && !user.isAdmin) {
        throw new PCDHTTPError(
          403,
          `user '${str(user)}' can't delete pipeline '${
            pipeline.id
          }' owned by other user ${pipeline.ownerUserId}`
        );
      }

      await this.pipelineDB.clearDefinition(pipelineId);
      await this.pipelineDB.saveLoadSummary(pipelineId, undefined);
      await this.pipelineAtomDB.clear(pipelineId);
      await this.pipelineExecutorSubservice.restartPipeline(pipelineId);
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
        existingSlot.owner = await this.userSubservice.getUserById(
          validatedNewDefinition.ownerUserId
        );
      }
      await this.saveLoadSummary(validatedNewDefinition.id, undefined);
      await this.pipelineAtomDB.clear(validatedNewDefinition.id);
      // purposely not awaited
      const restartPromise = this.pipelineExecutorSubservice.restartPipeline(
        validatedNewDefinition.id
      );
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

  public async saveLoadSummary(
    id: string,
    summary: PipelineLoadSummary | undefined
  ): Promise<void> {
    await this.pipelineDB.saveLoadSummary(id, summary);
  }

  public getAllPipelines(): PipelineSlot[] {
    return this.pipelineSlots;
  }
}
