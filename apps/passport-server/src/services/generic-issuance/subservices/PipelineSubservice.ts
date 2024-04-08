import {
  ActionConfigResponseValue,
  GenericIssuanceHistoricalSemaphoreGroupResponseValue,
  GenericIssuancePipelineListEntry,
  GenericIssuancePipelineSemaphoreGroupsResponseValue,
  GenericIssuanceSemaphoreGroupResponseValue,
  GenericIssuanceSemaphoreGroupRootResponseValue,
  GenericIssuanceValidSemaphoreGroupResponseValue,
  HydratedPipelineHistoryEntry,
  ListFeedsResponseValue,
  PipelineDefinition,
  PipelineHistoryEntry,
  PipelineInfoResponseValue,
  PipelineLoadSummary,
  PodboxTicketActionPreCheckRequest,
  PodboxTicketActionRequest,
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
import { CredentialSubservice } from "./CredentialSubservice";
import { PipelineAPISubservice } from "./PipelineAPISubservice";
import { PipelineExecutorSubservice } from "./PipelineExecutorSubservice";
import { UserSubservice } from "./UserSubservice";
import { InstantiatePipelineArgs } from "./utils/instantiatePipeline";
import {
  UpsertPipelineResult,
  upsertPipelineDefinition
} from "./utils/upsertPipelineDefinition";

const SERVICE_NAME = "GI_PIPELINE_SUBSERVICE";

/**
 * Encapsulates Podbox' Pipeline functionality.
 */
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
    credentialSubservice: CredentialSubservice,
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
    this.pipelineAPISubservice = new PipelineAPISubservice(
      consumerDB,
      this,
      credentialSubservice
    );
  }

  /**
   * Call immediately after instantiating this service.
   * @param startLoadLoop whether or not to start a loop that loads {@link Pipeline}
   * data for each pipeline once per minute.
   */
  public async start(startLoadLoop?: boolean): Promise<void> {
    await this.executorSubservice.start(startLoadLoop);
  }

  /**
   * If there's a {@link Pipeline} load loop scheduled via {@link PipelineExecutorSubservice},
   * stops it.
   */
  public async stop(): Promise<void> {
    await this.executorSubservice.stop();
  }

  /**
   * Gets the {@link PipelineAtom}s that this Pipeline last loaded.
   * - these are stored in memory, so get wiped on every server restart
   * - only the atoms from the last load are stored for each pipeline.
   */
  public async getPipelineAtoms(pipelineId: string): Promise<PipelineAtom[]> {
    return this.pipelineAtomDB.load(pipelineId);
  }

  /**
   * Gets a particular pipeline slot.
   */
  public getPipeline(
    pipelineId: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineDB.getDefinition(pipelineId);
  }

  /**
   * Gets all instances of {@link Pipeline} that {@link PipelineExecutorSubservice} was
   * able to successfully start via {@link instantiatePipeline}.
   */
  public async getAllPipelineInstances(): Promise<Pipeline[]> {
    return this.executorSubservice
      .getAllPipelineSlots()
      .map((p) => p.instance)
      .filter((p) => !!p) as Pipeline[];
  }

  /**
   * Gets the {@link PipelineSlot} corresponding to the given @param pipelineId.
   */
  public async getPipelineSlot(
    pipelineId: string
  ): Promise<PipelineSlot | undefined> {
    return this.executorSubservice
      .getAllPipelineSlots()
      .find((p) => p.definition.id === pipelineId);
  }

  /**
   * @throws if there's no instantiated {@link PipelineSlot} for the @param id.
   * The server maintains one slot per pipeline in the definition DB. if a user
   * deletes a pipeline, the corresponding slot is removed from the total set of
   * slots.
   */
  public async ensurePipelineSlotExists(id: string): Promise<PipelineSlot> {
    return this.executorSubservice.ensurePipelineSlotExists(id);
  }

  /**
   * @throws if there's no {@link PipelineSlot} for the given @param id, or if
   * the {@link Pipeline} could not be instantiated via {@link instantiatePipeline}.
   */
  public async ensurePipelineStarted(id: string): Promise<Pipeline> {
    return this.executorSubservice.ensurePipelineStarted(id);
  }

  /**
   * Gets the last {@link PipelineLoadSummary} for the given pipeline identified by @param id,
   * which {@link PipelineExecutorSubservice} saves after each {@link Pipeline} load.
   */
  public async getLastLoadSummary(
    id: string
  ): Promise<PipelineLoadSummary | undefined> {
    return this.pipelineDB.getLastLoadSummary(id);
  }

  /**
   * Loads all {@link PipelineDefinition}s from the persistent database.
   */
  public async loadPipelineDefinitions(): Promise<PipelineDefinition[]> {
    return this.pipelineDB.loadPipelineDefinitions();
  }

  /**
   * Loads a particular {@link PipelineDefinition} from the databse, identified
   * by the @param id.
   */
  public async loadPipelineDefinition(
    id: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineDB.getDefinition(id);
  }

  /**
   * Saves a particular {@link PipelineDefinition} to the database.
   */
  public async saveDefinition(
    definition: PipelineDefinition,
    editorUserId: string | undefined
  ): Promise<void> {
    await this.pipelineDB.upsertDefinition(definition, editorUserId);
  }

  /**
   * Attempts to delete a given {@link PipelineDefinition}, {@link PipelineSlot},
   * and stop the instantiated {@link Pipeline} on behalf of the given {@link PipelineUser},
   * checking whether the user is permissioned to perform the given action.
   */
  public async deletePipelineDefinition(
    user: PipelineUser,
    pipelineId: string
  ): Promise<void> {
    return traced(SERVICE_NAME, "deletePipelineDefinition", async (span) => {
      traceUser(user);
      span?.setAttribute("pipeline_id", pipelineId);
      const pipeline = await this.loadPipelineDefinition(pipelineId);
      tracePipeline(pipeline);
      this.ensureUserHasPipelineDefinitionAccess(user, pipeline);
      if (pipeline.options?.protected) {
        throw new PCDHTTPError(
          401,
          "can't delete protected pipeline - turn off protection to delete"
        );
      }
      await this.pipelineDB.deleteDefinition(pipelineId);
      await this.pipelineDB.saveLoadSummary(pipelineId, undefined);
      await this.pipelineAtomDB.clear(pipelineId);
      await this.executorSubservice.restartPipeline(pipelineId);
    });
  }

  public async getPipelineEditHistory(
    pipelineId: string,
    maxQuantity?: number
  ): Promise<HydratedPipelineHistoryEntry[]> {
    const DEFAULT_MAX_QUANTITY = 100;
    const rawHistory = await this.pipelineDB.getEditHistory(
      pipelineId,
      maxQuantity ?? DEFAULT_MAX_QUANTITY
    );
    const hydratedHistory = await this.hydrateHistory(rawHistory);
    return hydratedHistory;
  }

  private async hydrateHistory(
    history: PipelineHistoryEntry[]
  ): Promise<HydratedPipelineHistoryEntry[]> {
    return Promise.all(
      history.map(
        async (
          h: PipelineHistoryEntry
        ): Promise<HydratedPipelineHistoryEntry> => {
          return {
            ...h,
            editorEmail: (await this.userSubservice.getUserById(h.editorUserId))
              ?.email
          } satisfies HydratedPipelineHistoryEntry;
        }
      )
    );
  }

  /**
   * Attempts to upsert the given {@link PipelineDefinition} on behalf of the given
   * {@link PipelineUser}, and (re)starts the corresponding {@link Pipeline} as
   * represented in {@link PipelineExecutorSubservice} by a {@link PipelineSlot}.
   */
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

  /**
   * Deletes all the {@link PipelineAtom}s for a given {@link Pipeline}.
   */
  public async clearAtomsForPipeline(pipelineId: string): Promise<void> {
    await this.pipelineAtomDB.clear(pipelineId);
  }

  /**
   * Gets all {@link Pipeline}s and their metadata that the given {@link PipelineUser}
   * can see given their user type and in the future sharing permissions.
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
   * Loads a {@link PipelineDefinition} if the given {@link PipelineUser} has access.
   */
  public async loadPipelineDefinitionForUser(
    user: PipelineUser,
    pipelineId: string
  ): Promise<PipelineDefinition> {
    return traced(SERVICE_NAME, "loadPipelineDefinitionForUser", async () => {
      logger(
        SERVICE_NAME,
        "loadPipelineDefinitionForUser",
        str(user),
        pipelineId
      );
      traceUser(user);
      const pipeline = await this.loadPipelineDefinition(pipelineId);
      tracePipeline(pipeline);
      this.ensureUserHasPipelineDefinitionAccess(user, pipeline);
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
  ): asserts pipeline {
    if (!pipeline) {
      throw new Error(`can't view undefined pipeline`);
    }

    const hasAccess = this.userHasPipelineDefinitionAccess(user, pipeline);
    if (!hasAccess) {
      throw new Error(`user ${user?.id} can not view pipeline ${pipeline?.id}`);
    }
  }

  /**
   * Returns whether or not the given {@link PipelineUser} has access to
   * the given {@link Pipeline}.
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
   * Saves a {@link PipelineLoadSummary} to in-memory store for a {@link Pipeline}
   * identified by the @param pipelineId.
   */
  public async saveLoadSummary(
    id: string,
    summary: PipelineLoadSummary | undefined
  ): Promise<void> {
    await this.pipelineDB.saveLoadSummary(id, summary);
  }

  /**
   * Gets all the {@link PipelineSlot}s {@link PipelineExecutorSubservice} has instantiated,
   * one per {@link PipelineDefinition} in the database.
   */
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
    req: PodboxTicketActionRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return this.pipelineAPISubservice.handleCheckIn(req);
  }

  public async handlePreCheck(
    req: PodboxTicketActionPreCheckRequest
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
