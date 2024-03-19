import { EdDSAPublicKey, isEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdgeCityBalance,
  GenericIssuancePipelineListEntry,
  GenericIssuanceSendEmailResponseValue,
  GenericPretixEvent,
  GenericPretixProduct,
  PipelineDefinition
} from "@pcd/passport-interface";
import { Request } from "express";
import stytch, { Client } from "stytch";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../apis/pretix/genericPretixAPI";
import { getBalances } from "../../database/queries/edgecity";
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
import { RollbarService } from "../rollbarService";
import { InMemoryPipelineAtomDB } from "./InMemoryPipelineAtomDB";
import { Pipeline, PipelineUser } from "./pipelines/types";
import { PipelineSubservice } from "./subservices/PipelineSubservice";
import { UserSubservice } from "./subservices/UserSubservice";
import { InstantiatePipelineArgs } from "./subservices/utils/instantiatePipeline";

const SERVICE_NAME = "GENERIC_ISSUANCE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export class GenericIssuanceService {
  private context: ApplicationContext;
  private pipelineAtomDB: IPipelineAtomDB;
  private checkinDB: IPipelineCheckinDB;
  private contactDB: IContactSharingDB;
  private badgeDB: IBadgeGiftingDB;
  private consumerDB: IPipelineConsumerDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private genericPretixAPI: IGenericPretixAPI;
  private rollbarService: RollbarService | null;
  private pipelineSubservice: PipelineSubservice;
  private userSubservice: UserSubservice;

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

    this.pipelineSubservice = new PipelineSubservice(
      context,
      this.pipelineAtomDB,
      this.userSubservice,
      pagerdutyService,
      discordService,
      rollbarService,
      {
        zupassPublicKey,
        eddsaPrivateKey,
        cacheService,
        lemonadeAPI,
        genericPretixAPI: this.genericPretixAPI,
        pipelineAtomDB: this.pipelineAtomDB,
        checkinDB: this.checkinDB,
        contactDB: this.contactDB,
        badgeDB: this.badgeDB,
        consumerDB: this.consumerDB,
        semaphoreHistoryDB: this.semaphoreHistoryDB
      } satisfies InstantiatePipelineArgs
    );
  }

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

  public async upsertPipelineDefinition(
    user: PipelineUser,
    pipelineDefinition: PipelineDefinition
  ): Promise<{
    definition: PipelineDefinition;
    restartPromise: Promise<void>;
  }> {
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

  public async fetchAllPretixEvents(
    orgUrl: string,
    token: string
  ): Promise<GenericPretixEvent[]> {
    return this.genericPretixAPI.fetchAllEvents(orgUrl, token);
  }

  public async fetchPretixProducts(
    orgUrl: string,
    token: string,
    eventID: string
  ): Promise<GenericPretixProduct[]> {
    return this.genericPretixAPI.fetchProducts(orgUrl, token, eventID);
  }

  public async getBalances(): Promise<EdgeCityBalance[]> {
    return getBalances(this.context.dbPool);
  }
}

export async function startGenericIssuanceService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  lemonadeAPI: ILemonadeAPI | null,
  genericPretixAPI: IGenericPretixAPI | null,
  pagerDutyService: PagerDutyService | null,
  discordService: DiscordService | null,
  cacheService: PersistentCacheService | null
): Promise<GenericIssuanceService | null> {
  logger("[INIT] attempting to start Generic Issuance service");

  if (!cacheService) {
    logger(
      "[INIT] not starting generic issuance service - missing persistent cache service"
    );
    return null;
  }

  if (!lemonadeAPI) {
    logger(
      "[INIT] not starting generic issuance service - missing lemonade API"
    );
    return null;
  }

  if (!genericPretixAPI) {
    logger("[INIT] not starting generic issuance service - missing pretix API");
    return null;
  }

  const pkeyEnv = process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY;
  if (pkeyEnv == null) {
    logger(
      "[INIT] missing environment variable GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY"
    );
    return null;
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.STYTCH_BYPASS === "true"
  ) {
    throw new Error(
      "cannot create generic issuance service without stytch in production "
    );
  }

  const BYPASS_EMAIL =
    process.env.NODE_ENV !== "production" &&
    process.env.STYTCH_BYPASS === "true";

  const projectIdEnv = process.env.STYTCH_PROJECT_ID;
  const secretEnv = process.env.STYTCH_SECRET;
  let stytchClient: Client | undefined = undefined;

  if (!BYPASS_EMAIL) {
    if (projectIdEnv == null) {
      logger("[INIT] missing environment variable STYTCH_PROJECT_ID");
      return null;
    }

    if (secretEnv == null) {
      logger("[INIT] missing environment variable STYTCH_SECRET");
      return null;
    }

    stytchClient = new stytch.Client({
      project_id: projectIdEnv,
      secret: secretEnv
    });
  }

  const genericIssuanceClientUrl = process.env.GENERIC_ISSUANCE_CLIENT_URL;
  if (genericIssuanceClientUrl == null) {
    logger("[INIT] missing GENERIC_ISSUANCE_CLIENT_URL");
    return null;
  }

  const zupassPublicKeyEnv = process.env.GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY;
  if (!zupassPublicKeyEnv) {
    logger("[INIT missing GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY");
    return null;
  }

  let zupassPublicKey: EdDSAPublicKey;
  try {
    zupassPublicKey = JSON.parse(zupassPublicKeyEnv);
    if (!isEdDSAPublicKey(zupassPublicKey)) {
      throw new Error("Invalid public key");
    }
  } catch (e) {
    logger("[INIT] invalid GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY");
    return null;
  }

  const issuanceService = new GenericIssuanceService(
    context,
    zupassPublicKey,
    pkeyEnv,
    genericIssuanceClientUrl,
    genericPretixAPI,
    lemonadeAPI,
    stytchClient,
    rollbarService,
    pagerDutyService,
    discordService,
    cacheService
  );

  issuanceService.start();

  return issuanceService;
}
