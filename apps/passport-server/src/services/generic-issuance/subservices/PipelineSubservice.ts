import {
  ActionConfigResponseValue,
  GenericIssuanceHistoricalSemaphoreGroupResponseValue,
  GenericIssuancePipelineListEntry,
  GenericIssuancePipelineSemaphoreGroupsResponseValue,
  GenericIssuanceSemaphoreGroupResponseValue,
  GenericIssuanceSemaphoreGroupRootResponseValue,
  GenericIssuanceSendPipelineEmailResponseValue,
  GenericIssuanceValidSemaphoreGroupResponseValue,
  HydratedPipelineHistoryEntry,
  ListFeedsResponseValue,
  PipelineDefinition,
  PipelineEmailType,
  PipelineHistoryEntry,
  PipelineInfoResponseValue,
  PipelineLoadSummary,
  PodboxTicketActionPreCheckRequest,
  PodboxTicketActionRequest,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  isLemonadePipelineDefinition,
  isPretixPipelineDefinition
} from "@pcd/passport-interface";
import { RollbarService } from "@pcd/server-shared";
import { str } from "@pcd/util";
import { PoolClient } from "postgres-pool";
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
import { traced } from "../../telemetryService";
import { tracePipeline, traceUser } from "../honeycombQueries";
import {
  LemonadeAtom,
  LemonadePipeline,
  isLemonadeAtom
} from "../pipelines/LemonadePipeline";
import { PretixAtom, isPretixAtom } from "../pipelines/PretixPipeline";
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
    this.pipelineDB = new PipelineDefinitionDB();
    this.pipelineAtomDB = pipelineAtomDB;
    this.executorSubservice = new PipelineExecutorSubservice(
      this,
      context,
      userSubservice,
      pagerdutyService,
      discordService,
      rollbarService,
      instantiatePipelineArgs
    );
    this.userSubservice = userSubservice;
    this.pipelineAPISubservice = new PipelineAPISubservice(
      context,
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

  public async validateEmailAndPretixOrderCode(
    client: PoolClient,
    email: string,
    code: string
  ): Promise<boolean> {
    // todo: optimized query?
    const definitions = await this.loadPipelineDefinitions(client);
    const relevantPipelines = definitions.filter(
      (d) => isPretixPipelineDefinition(d) || isLemonadePipelineDefinition(d)
    );
    const hasAtom = (
      await Promise.all(
        relevantPipelines.map((p) => this.pipelineAtomDB.load(p.id))
      )
    ).some((atoms) =>
      (atoms as Array<PretixAtom | LemonadeAtom>).some((a) => {
        if (isPretixAtom(a)) {
          return a.email === email && a.orderCode === code;
        } else if (isLemonadeAtom(a)) {
          return a.email === email && a.lemonadeTicketId === code;
        }
        return false;
      })
    );
    return hasAtom;
  }

  /**
   * Gets a particular pipeline slot.
   */
  public getPipeline(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineDB.getDefinition(client, pipelineId);
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
    client: PoolClient,
    id: string
  ): Promise<PipelineLoadSummary | undefined> {
    return this.pipelineDB.getLastLoadSummary(client, id);
  }

  /**
   * Loads all {@link PipelineDefinition}s from the persistent database.
   */
  public async loadPipelineDefinitions(
    client: PoolClient
  ): Promise<PipelineDefinition[]> {
    return this.pipelineDB.loadPipelineDefinitions(client);
  }

  /**
   * Loads a particular {@link PipelineDefinition} from the databse, identified
   * by the @param id.
   */
  public async loadPipelineDefinition(
    client: PoolClient,
    id: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineDB.getDefinition(client, id);
  }

  /**
   * Saves a particular {@link PipelineDefinition} to the database.
   */
  public async saveDefinition(
    client: PoolClient,
    definition: PipelineDefinition,
    editorUserId: string | undefined
  ): Promise<void> {
    await this.pipelineDB.upsertDefinition(client, definition, editorUserId);
  }

  /**
   * Attempts to delete a given {@link PipelineDefinition}, {@link PipelineSlot},
   * and stop the instantiated {@link Pipeline} on behalf of the given {@link PipelineUser},
   * checking whether the user is permissioned to perform the given action.
   */
  public async deletePipelineDefinition(
    client: PoolClient,
    user: PipelineUser,
    pipelineId: string
  ): Promise<void> {
    return traced(SERVICE_NAME, "deletePipelineDefinition", async (span) => {
      traceUser(user);
      span?.setAttribute("pipeline_id", pipelineId);
      const pipeline = await this.loadPipelineDefinition(client, pipelineId);
      tracePipeline(pipeline);
      this.ensureUserHasPipelineDefinitionAccess(user, pipeline);
      if (pipeline.options?.protected) {
        throw new PCDHTTPError(
          401,
          "can't delete protected pipeline - turn off protection to delete"
        );
      }
      await this.pipelineDB.deleteDefinition(client, pipelineId);
      await this.pipelineDB.saveLoadSummary(client, pipelineId, undefined);
      await this.pipelineAtomDB.clear(pipelineId);
      await this.executorSubservice.restartPipeline(client, pipelineId);
    });
  }

  public async getPipelineEditHistory(
    client: PoolClient,
    pipelineId: string,
    maxQuantity?: number
  ): Promise<HydratedPipelineHistoryEntry[]> {
    const DEFAULT_MAX_QUANTITY = 100;
    const rawHistory = await this.pipelineDB.getEditHistory(
      client,
      pipelineId,
      maxQuantity ?? DEFAULT_MAX_QUANTITY
    );
    const hydratedHistory = await this.hydrateHistory(client, rawHistory);
    return hydratedHistory;
  }

  private async hydrateHistory(
    client: PoolClient,
    history: PipelineHistoryEntry[]
  ): Promise<HydratedPipelineHistoryEntry[]> {
    return Promise.all(
      history.map(
        async (
          h: PipelineHistoryEntry
        ): Promise<HydratedPipelineHistoryEntry> => {
          return {
            ...h,
            editorEmail: (
              await this.userSubservice.getUserById(client, h.editorUserId)
            )?.email
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
    client: PoolClient,
    user: PipelineUser,
    newDefinition: PipelineDefinition
  ): Promise<UpsertPipelineResult> {
    return traced(SERVICE_NAME, "upsertPipelineDefinition", async () => {
      logger(SERVICE_NAME, "upsertPipelineDefinition", str(newDefinition));
      return await upsertPipelineDefinition(
        client,
        user,
        newDefinition,
        this.userSubservice,
        this,
        this.executorSubservice
      );
    });
  }

  public async handleSendPipelineEmail(
    client: PoolClient,
    pipelineId: string,
    email: PipelineEmailType
  ): Promise<GenericIssuanceSendPipelineEmailResponseValue> {
    const pipelineSlot = await this.getPipelineSlot(pipelineId);

    if (LemonadePipeline.is(pipelineSlot?.instance)) {
      return await pipelineSlot.instance.sendPipelineEmail(client, email);
    }

    throw new PCDHTTPError(400, "only lemonade pipeline can send emails");
  }

  /**
   * Gets all {@link Pipeline}s and their metadata that the given {@link PipelineUser}
   * can see given their user type and in the future sharing permissions.
   */
  public async getAllUserPipelineDefinitions(
    client: PoolClient,
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
            const summary = await this.getLastLoadSummary(
              client,
              slot.definition.id
            );
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
    client: PoolClient,
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
      const pipeline = await this.loadPipelineDefinition(client, pipelineId);
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
    client: PoolClient,
    id: string,
    summary: PipelineLoadSummary | undefined
  ): Promise<void> {
    await this.pipelineDB.saveLoadSummary(client, id, summary);
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
    client: PoolClient,
    user: PipelineUser,
    pipelineId: string
  ): Promise<PipelineInfoResponseValue> {
    return this.pipelineAPISubservice.handleGetPipelineInfo(
      client,
      user,
      pipelineId
    );
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
