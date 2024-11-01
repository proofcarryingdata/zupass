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
  GenericIssuanceSendPipelineEmailResponseValue,
  GenericIssuanceValidSemaphoreGroupResponseValue,
  GenericPretixEvent,
  GenericPretixProduct,
  ListFeedsResponseValue,
  PipelineDefinition,
  PipelineEmailType,
  PipelineInfoResponseValue,
  PipelineLoadSummary,
  PodboxTicketActionPreCheckRequest,
  PodboxTicketActionRequest,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  TicketPreviewResultValue
} from "@pcd/passport-interface";
import { RollbarService } from "@pcd/server-shared";
import { Request } from "express";
import { PoolClient } from "postgres-pool";
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
  IPipelineDefinitionDB,
  PipelineDefinitionDB
} from "../../database/queries/pipelineDefinitionDB";
import {
  IPipelineEmailDB,
  PipelineEmailDB
} from "../../database/queries/pipelineEmailDB";
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
import { PCDHTTPError } from "../../routing/pcdHttpError";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import { LocalFileService } from "../LocalFileService";
import { DiscordService } from "../discordService";
import { EmailService } from "../emailService";
import { PagerDutyService } from "../pagerDutyService";
import { PersistentCacheService } from "../persistentCacheService";
import { InMemoryPipelineAtomDB } from "./InMemoryPipelineAtomDB";
import { PretixPipeline } from "./pipelines/PretixPipeline";
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
  private pipelineDB: IPipelineDefinitionDB;
  private checkinDB: IPipelineCheckinDB;
  private contactDB: IContactSharingDB;
  private badgeDB: IBadgeGiftingDB;
  private emailDB: IPipelineEmailDB;
  private consumerDB: IPipelineConsumerDB;
  private manualTicketDB: IPipelineManualTicketDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private genericPretixAPI: IGenericPretixAPI;
  private rollbarService: RollbarService | null;
  private pipelineSubservice: PipelineSubservice;
  private userSubservice: UserSubservice;
  private credentialSubservice: CredentialSubservice;
  private localFileService: LocalFileService | null;

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
    emailService: EmailService,
    cacheService: PersistentCacheService,
    credentialSubservice: CredentialSubservice,
    localFileService: LocalFileService | null
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.checkinDB = new PipelineCheckinDB();
    this.consumerDB = new PipelineConsumerDB();
    this.manualTicketDB = new PipelineManualTicketDB();
    this.semaphoreHistoryDB = new PipelineSemaphoreHistoryDB();
    this.genericPretixAPI = pretixAPI;
    this.contactDB = new ContactSharingDB();
    this.badgeDB = new BadgeGiftingDB();
    this.emailDB = new PipelineEmailDB();
    this.pipelineAtomDB = new InMemoryPipelineAtomDB();
    this.pipelineDB = new PipelineDefinitionDB();
    this.userSubservice = new UserSubservice(
      context,
      stytchClient,
      genericIssuanceClientUrl
    );
    this.credentialSubservice = credentialSubservice;
    this.localFileService = localFileService;
    this.pipelineSubservice = new PipelineSubservice(
      context,
      this.pipelineAtomDB,
      this.pipelineDB,
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
        pipelineDB: this.pipelineDB,
        checkinDB: this.checkinDB,
        contactDB: this.contactDB,
        emailDB: this.emailDB,
        badgeDB: this.badgeDB,
        consumerDB: this.consumerDB,
        manualTicketDB: this.manualTicketDB,
        semaphoreHistoryDB: this.semaphoreHistoryDB,
        credentialSubservice: this.credentialSubservice,
        emailService,
        context,
        localFileService
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

  public async authSession(
    client: PoolClient,
    req: Request
  ): Promise<PipelineUser> {
    return this.userSubservice.authSession(client, req);
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
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineSubservice.loadPipelineDefinition(client, pipelineId);
  }

  public async upsertPipelineDefinition(
    client: PoolClient,
    user: PipelineUser,
    pipelineDefinition: PipelineDefinition
  ): Promise<UpsertPipelineResult> {
    return this.pipelineSubservice.upsertPipelineDefinition(
      client,
      user,
      pipelineDefinition
    );
  }

  /**
   * For testing only. Will throw in prod.
   */
  public async performPipelineLoad(
    pipelineId: string
  ): Promise<PipelineLoadSummary> {
    return this.pipelineSubservice.performPipelineLoad(pipelineId);
  }

  public async deletePipelineDefinition(
    client: PoolClient,
    user: PipelineUser,
    pipelineId: string
  ): Promise<void> {
    return this.pipelineSubservice.deletePipelineDefinition(
      client,
      user,
      pipelineId
    );
  }

  public async clearPipelineCache(
    client: PoolClient,
    pipelineId: string,
    user: PipelineUser
  ): Promise<void> {
    return this.pipelineSubservice.clearPipelineCache(client, user, pipelineId);
  }

  public async loadPipelineDefinition(
    client: PoolClient,
    user: PipelineUser,
    id: string
  ): Promise<PipelineDefinition | undefined> {
    return this.pipelineSubservice.loadPipelineDefinitionForUser(
      client,
      user,
      id
    );
  }

  public async handlePollFeed(
    pipelineId: string,
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return this.pipelineSubservice.handlePollFeed(pipelineId, req);
  }

  public async handleGetPipelineInfo(
    client: PoolClient,
    user: PipelineUser,
    pipelineId: string
  ): Promise<PipelineInfoResponseValue> {
    return this.pipelineSubservice.handleGetPipelineInfo(
      client,
      user,
      pipelineId
    );
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
    client: PoolClient,
    email: string,
    code: string
  ): Promise<boolean> {
    return this.pipelineSubservice.validateEmailAndPretixOrderCode(
      client,
      email,
      code
    );
  }

  public async handleGetPipelineSemaphoreGroups(
    pipelineId: string
  ): Promise<GenericIssuancePipelineSemaphoreGroupsResponseValue> {
    return this.pipelineSubservice.handleGetPipelineSemaphoreGroups(pipelineId);
  }

  public async handleSendPipelineEmail(
    client: PoolClient,
    pipelineId: string,
    email: PipelineEmailType
  ): Promise<GenericIssuanceSendPipelineEmailResponseValue> {
    return this.pipelineSubservice.handleSendPipelineEmail(
      client,
      pipelineId,
      email
    );
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
  public async getEdgeCityBalances(
    client: PoolClient
  ): Promise<EdgeCityBalance[]> {
    return getEdgeCityBalances(client);
  }

  /**
   * Given an email and order code, and optionally a pipeline ID (which defaults to DEVCON_PIPELINE_ID),
   * returns the ticket previews for the given email and order code. A ticket preview is basically a
   * PODTicket in non-pcd form - just the raw IPODTicketData. This is used to display all the tickets
   * a user might need when trying to check into an event, without having them go through a costly
   * and slow account registration flow.
   */
  public async handleGetTicketPreview(
    email: string,
    orderCode: string,
    pipelineId?: string
  ): Promise<TicketPreviewResultValue> {
    const requestedPipelineId = pipelineId ?? process.env.DEVCON_PIPELINE_ID;
    const pipeline = (await this.getAllPipelineInstances()).find(
      (p) => p.id === requestedPipelineId && PretixPipeline.is(p)
    ) as PretixPipeline | undefined;

    if (!pipeline) {
      throw new PCDHTTPError(
        400,
        "handleGetTicketPreview: pipeline not found " + requestedPipelineId
      );
    }

    const tickets = await pipeline.getAllTickets();

    // Check that a valid atom exists with the given orderCode and email
    const validAtom = tickets.atoms.find(
      (atom) => atom.orderCode === orderCode && atom.email === email
    );
    if (!validAtom) {
      throw new PCDHTTPError(
        400,
        `No ticket found with order code ${orderCode} and email ${email}`
      );
    }

    const matchingTickets = tickets.atoms.filter(
      (atom) => atom.email === email
    );

    const ticketDatas = matchingTickets.map(
      (atom) => pipeline.atomToPODTicketData(atom, "1") // fake semaphore id as it's not needed for the ticket preview
    );

    return {
      tickets: ticketDatas
    } satisfies TicketPreviewResultValue;
  }
}
