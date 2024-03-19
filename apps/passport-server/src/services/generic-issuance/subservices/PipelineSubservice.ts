import {
  ActionConfigResponseValue,
  GenericIssuanceCheckInRequest,
  GenericIssuanceHistoricalSemaphoreGroupResponseValue,
  GenericIssuancePipelineListEntry,
  GenericIssuancePipelineSemaphoreGroupsResponseValue,
  GenericIssuancePreCheckRequest,
  GenericIssuanceSemaphoreGroupResponseValue,
  GenericIssuanceSemaphoreGroupRootResponseValue,
  GenericIssuanceValidSemaphoreGroupResponseValue,
  ListFeedsResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue,
  PipelineLoadSummary,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { str } from "@pcd/util";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { IPipelineConsumerDB } from "../../../database/queries/pipelineConsumerDB";
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
import { PipelineAPISubservice } from "./PipelineAPISubservice";
import { PipelineExecutorSubservice } from "./PipelineExecutorSubservice";
import { UserSubservice } from "./UserSubservice";
import { InstantiatePipelineArgs } from "./utils/instantiatePipeline";
import {
  UpsertPipelineResult,
  upsertPipelineDefinition
} from "./utils/upsertPipelineDefinition";

const SERVICE_NAME = "GENERIC_ISSUANCE_PIPELINE";

export class PipelineSubservice {
  private pipelineAtomDB: IPipelineAtomDB;
  private pipelineDB: IPipelineDefinitionDB;
  private userSubservice: UserSubservice;
  private executorSubservice: PipelineExecutorSubservice;
  private pipelineAPISubservice: PipelineAPISubservice;

  public constructor(
    context: ApplicationContext,
    pipelineAtomDB: IPipelineAtomDB,
    consumerDB: IPipelineConsumerDB,
    userSubservice: UserSubservice,
    pagerdutyService: PagerDutyService | null,
    discordService: DiscordService | null,
    rollbarService: RollbarService | null,
    instantiatePipelineArgs: InstantiatePipelineArgs
  ) {
    this.pipelineDB = new PipelineDefinitionDB(context.dbPool);
    this.pipelineAtomDB = pipelineAtomDB;
    this.executorSubservice = new PipelineExecutorSubservice(
      this,
      userSubservice,
      pagerdutyService,
      discordService,
      rollbarService,
      instantiatePipelineArgs
    );
    this.userSubservice = userSubservice;
    this.pipelineAPISubservice = new PipelineAPISubservice(consumerDB, this);
  }

  public async start(startLoadLoop?: boolean): Promise<void> {
    await this.executorSubservice.start(startLoadLoop);
  }

  public async stop(): Promise<void> {
    await this.executorSubservice.stop();
  }

  public async getPipelineAtoms(pipelineId: string): Promise<PipelineAtom[]> {
    return this.pipelineAtomDB.load(pipelineId);
  }

  public async getAllPipelineInstances(): Promise<Pipeline[]> {
    return this.executorSubservice
      .getAllPipelineSlots()
      .map((p) => p.instance)
      .filter((p) => !!p) as Pipeline[];
  }

  public async getPipelineSlot(id: string): Promise<PipelineSlot | undefined> {
    return this.executorSubservice
      .getAllPipelineSlots()
      .find((p) => p.definition.id === id);
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
      await this.executorSubservice.restartPipeline(pipelineId);
    });
  }

  public async upsertPipelineDefinition(
    user: PipelineUser,
    newDefinition: PipelineDefinition
  ): Promise<UpsertPipelineResult> {
    return traced(SERVICE_NAME, "upsertPipelineDefinition", async () => {
      logger(SERVICE_NAME, "upsertPipelineDefinition", str(newDefinition));
      return await upsertPipelineDefinition(
        user,
        newDefinition,
        this.userSubservice,
        this,
        this.executorSubservice
      );
    });
  }

  public async clearAtomsForPipeline(pipelineId: string): Promise<void> {
    await this.pipelineAtomDB.clear(pipelineId);
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

        const visiblePipelines = this.executorSubservice
          .getAllPipelineSlots()
          .filter((slot) =>
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
    return this.executorSubservice.getAllPipelineSlots();
  }

  public async handlePollFeed(
    pipelineId: string,
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return this.pipelineAPISubservice.handlePollFeed(pipelineId, req);
  }

  public async handleGetPipelineInfo(
    user: PipelineUser,
    pipelineId: string
  ): Promise<PipelineInfoResponseValue> {
    return this.pipelineAPISubservice.handleGetPipelineInfo(user, pipelineId);
  }

  public async handleListFeed(
    pipelineId: string,
    feedId: string
  ): Promise<ListFeedsResponseValue> {
    return this.pipelineAPISubservice.handleListFeed(pipelineId, feedId);
  }

  public async handleCheckIn(
    req: GenericIssuanceCheckInRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return this.pipelineAPISubservice.handleCheckIn(req);
  }

  public async handlePreCheck(
    req: GenericIssuancePreCheckRequest
  ): Promise<ActionConfigResponseValue> {
    return this.pipelineAPISubservice.handlePreCheck(req);
  }

  public async handleGetSemaphoreGroup(
    pipelineId: string,
    groupId: string
  ): Promise<GenericIssuanceSemaphoreGroupResponseValue> {
    return this.pipelineAPISubservice.handleGetSemaphoreGroup(
      pipelineId,
      groupId
    );
  }

  public async handleGetLatestSemaphoreGroupRoot(
    pipelineId: string,
    groupId: string
  ): Promise<GenericIssuanceSemaphoreGroupRootResponseValue> {
    return this.pipelineAPISubservice.handleGetLatestSemaphoreGroupRoot(
      pipelineId,
      groupId
    );
  }

  public async handleGetHistoricalSemaphoreGroup(
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<GenericIssuanceHistoricalSemaphoreGroupResponseValue> {
    return this.pipelineAPISubservice.handleGetHistoricalSemaphoreGroup(
      pipelineId,
      groupId,
      rootHash
    );
  }

  public async handleGetValidSemaphoreGroup(
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<GenericIssuanceValidSemaphoreGroupResponseValue> {
    return this.pipelineAPISubservice.handleGetValidSemaphoreGroup(
      pipelineId,
      groupId,
      rootHash
    );
  }

  public async handleGetPipelineSemaphoreGroups(
    pipelineId: string
  ): Promise<GenericIssuancePipelineSemaphoreGroupsResponseValue> {
    return this.pipelineAPISubservice.handleGetPipelineSemaphoreGroups(
      pipelineId
    );
  }
}
