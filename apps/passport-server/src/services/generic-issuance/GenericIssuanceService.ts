import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  ActionConfigResponseValue,
  EdgeCityBalance,
  GenericIssuanceHistoricalSemaphoreGroupResponseValue,
  GenericIssuancePipelineListEntry,
  GenericIssuancePipelineSemaphoreGroupsResponseValue,
  GenericIssuanceSemaphoreGroupResponseValue,
  GenericIssuanceSemaphoreGroupRootResponseValue,
  GenericIssuanceSendEmailResponseValue,
  GenericIssuanceValidSemaphoreGroupResponseValue,
  GenericPretixEvent,
  GenericPretixProduct,
  ListFeedsResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue,
  PodboxTicketActionPreCheckRequest,
  PodboxTicketActionRequest,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { RollbarService } from "@pcd/server-shared";
import { Request } from "express";
import { Client } from "stytch";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../apis/pretix/genericPretixAPI";
import { getEdgeCityBalances } from "../../database/queries/getEdgeCityBalances";
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
  IPipelineManualTicketDB,
  PipelineManualTicketDB
} from "../../database/queries/pipelineManualTicketDB";
import {
  IPipelineSemaphoreHistoryDB,
  PipelineSemaphoreHistoryDB
} from "../../database/queries/pipelineSemaphoreHistoryDB";
import {
  BadgeGiftingDB,
  ContactSharingDB,
  IBadgeGiftingDB,
  IContactSharingDB
} from "../../database/queries/ticketActionDBs";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import { DiscordService } from "../discordService";
import { PagerDutyService } from "../pagerDutyService";
import { PersistentCacheService } from "../persistentCacheService";
import { InMemoryPipelineAtomDB } from "./InMemoryPipelineAtomDB";
import { Pipeline, PipelineUser } from "./pipelines/types";
import { CredentialSubservice } from "./subservices/CredentialSubservice";
import { PipelineSubservice } from "./subservices/PipelineSubservice";
import { UserSubservice } from "./subservices/UserSubservice";
import { InstantiatePipelineArgs } from "./subservices/utils/instantiatePipeline";
import { UpsertPipelineResult } from "./subservices/utils/upsertPipelineDefinition";

const SERVICE_NAME = "GENERIC_ISSUANCE";
const LOG_TAG = `[${SERVICE_NAME}]`;

/**
 * Encasulates all Generic Issuance / Podbox backend logic, including
 * - management of all {@link Pipeline}s and all their features
 * - management of all {@link PipelineUser} and their authentication
 */
export class GenericIssuanceService {
  private context: ApplicationContext;
  private pipelineAtomDB: IPipelineAtomDB;
  private checkinDB: IPipelineCheckinDB;
  private contactDB: IContactSharingDB;
  private badgeDB: IBadgeGiftingDB;
  private consumerDB: IPipelineConsumerDB;
  private manualTicketDB: IPipelineManualTicketDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private genericPretixAPI: IGenericPretixAPI;
  private rollbarService: RollbarService | null;
  private pipelineSubservice: PipelineSubservice;
  private userSubservice: UserSubservice;
  private credentialSubservice: CredentialSubservice;

  public constructor(
    context: ApplicationContext,
    zupassPublicKey: EdDSAPublicKey,
    eddsaPrivateKey: string,
    genericIssuanceClientUrl: string,
    pretixAPI: IGenericPretixAPI,
    lemonadeAPI: ILemonadeAPI,
    stytchClient: Client | undefined,
    rollbarService: RollbarService | null,
    pagerdutyService: PagerDutyService | null,
    discordService: DiscordService | null,
    cacheService: PersistentCacheService
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.checkinDB = new PipelineCheckinDB(context.dbPool);
    this.consumerDB = new PipelineConsumerDB(context.dbPool);
    this.manualTicketDB = new PipelineManualTicketDB(context.dbPool);
    this.semaphoreHistoryDB = new PipelineSemaphoreHistoryDB(context.dbPool);
    this.genericPretixAPI = pretixAPI;
    this.contactDB = new ContactSharingDB(this.context.dbPool);
    this.badgeDB = new BadgeGiftingDB(this.context.dbPool);
    this.pipelineAtomDB = new InMemoryPipelineAtomDB();
    this.userSubservice = new UserSubservice(
      context,
      stytchClient,
      genericIssuanceClientUrl
    );
    this.credentialSubservice = new CredentialSubservice(
      zupassPublicKey,
      context.dbPool
    );
    this.pipelineSubservice = new PipelineSubservice(
      context,
      this.pipelineAtomDB,
      this.consumerDB,
      this.userSubservice,
      this.credentialSubservice,
      pagerdutyService,
      discordService,
      rollbarService,
      {
        eddsaPrivateKey,
        cacheService,
        lemonadeAPI,
        genericPretixAPI: this.genericPretixAPI,
        pipelineAtomDB: this.pipelineAtomDB,
        checkinDB: this.checkinDB,
        contactDB: this.contactDB,
        badgeDB: this.badgeDB,
        consumerDB: this.consumerDB,
        manualTicketDB: this.manualTicketDB,
        semaphoreHistoryDB: this.semaphoreHistoryDB,
        credentialSubservice: this.credentialSubservice,
        context
      } satisfies InstantiatePipelineArgs
    );
  }

  /**
   * To be called immediately after instantiating. Starts all Podbox background tasks.
   * Unless @param startLoadLoop is false, starts a {@link Pipeline} loading loop
   * which loads all pipeline data once per minute. See {@link PipelineExecutorService}.
   */
  public async start(startLoadLoop?: boolean): Promise<void> {
    try {
      await this.pipelineSubservice.start(startLoadLoop);
      await this.userSubservice.start();
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

  public async authSession(req: Request): Promise<PipelineUser> {
    return this.userSubservice.authSession(req);
  }

  public async sendLoginEmail(
    email: string
  ): Promise<GenericIssuanceSendEmailResponseValue> {
    return this.userSubservice.sendLoginEmail(email);
  }

  public getAllPipelineInstances(): Promise<Pipeline[]> {
    return this.pipelineSubservice.getAllPipelineInstances();
  }

  public getPipeline(
    pipelineId: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineSubservice.loadPipelineDefinition(pipelineId);
  }

  public async upsertPipelineDefinition(
    user: PipelineUser,
    pipelineDefinition: PipelineDefinition
  ): Promise<UpsertPipelineResult> {
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

  public async handlePollFeed(
    pipelineId: string,
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return this.pipelineSubservice.handlePollFeed(pipelineId, req);
  }

  public async handleGetPipelineInfo(
    user: PipelineUser,
    pipelineId: string
  ): Promise<PipelineInfoResponseValue> {
    return this.pipelineSubservice.handleGetPipelineInfo(user, pipelineId);
  }

  public async handleListFeed(
    pipelineId: string,
    feedId: string
  ): Promise<ListFeedsResponseValue> {
    return this.pipelineSubservice.handleListFeed(pipelineId, feedId);
  }

  public async handleCheckIn(
    req: PodboxTicketActionRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return this.pipelineSubservice.handleCheckIn(req);
  }

  public async handlePreCheck(
    req: PodboxTicketActionPreCheckRequest
  ): Promise<ActionConfigResponseValue> {
    return this.pipelineSubservice.handlePreCheck(req);
  }

  public async handleGetSemaphoreGroup(
    pipelineId: string,
    groupId: string
  ): Promise<GenericIssuanceSemaphoreGroupResponseValue> {
    return this.pipelineSubservice.handleGetSemaphoreGroup(pipelineId, groupId);
  }

  public async handleGetLatestSemaphoreGroupRoot(
    pipelineId: string,
    groupId: string
  ): Promise<GenericIssuanceSemaphoreGroupRootResponseValue> {
    return this.pipelineSubservice.handleGetLatestSemaphoreGroupRoot(
      pipelineId,
      groupId
    );
  }

  public async handleGetHistoricalSemaphoreGroup(
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<GenericIssuanceHistoricalSemaphoreGroupResponseValue> {
    return this.pipelineSubservice.handleGetHistoricalSemaphoreGroup(
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
    return this.pipelineSubservice.handleGetValidSemaphoreGroup(
      pipelineId,
      groupId,
      rootHash
    );
  }

  public async validateEmailAndPretixOrderCode(
    email: string,
    code: string
  ): Promise<boolean> {
    return this.pipelineSubservice.validateEmailAndPretixOrderCode(email, code);
  }

  public async handleGetPipelineSemaphoreGroups(
    pipelineId: string
  ): Promise<GenericIssuancePipelineSemaphoreGroupsResponseValue> {
    return this.pipelineSubservice.handleGetPipelineSemaphoreGroups(pipelineId);
  }

  /**
   * Used by the Podbox client as part of the {@link PretixPipeline} creation flow.
   */
  public async fetchAllPretixEvents(
    orgUrl: string,
    token: string
  ): Promise<GenericPretixEvent[]> {
    return this.genericPretixAPI.fetchAllEvents(orgUrl, token);
  }

  /**
   * Used by the Podbox client as part of the {@link PretixPipeline} creation flow.
   */
  public async fetchPretixProducts(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<GenericPretixProduct[]> {
    return this.genericPretixAPI.fetchProducts(orgUrl, token, eventID);
  }

  /**
   * Used by the Edge City folder UI in Zupass.
   */
  public async getEdgeCityBalances(): Promise<EdgeCityBalance[]> {
    return getEdgeCityBalances(this.context.dbPool);
  }
}
