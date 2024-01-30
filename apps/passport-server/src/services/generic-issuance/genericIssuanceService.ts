import {
  CheckTicketInResponseValue,
  GenericIssuanceCheckInRequest,
  GenericIssuanceSendEmailResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { Request } from "express";
import stytch, { Client, Session } from "stytch";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IPipelineAtomDB } from "../../database/queries/pipelineAtomDB";
import { IPipelineDefinitionDB } from "../../database/queries/pipelineDefinitionDB";
import { PCDHTTPError } from "../../routing/pcdHttpError";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import {
  CheckinCapability,
  isCheckinCapability
} from "./capabilities/CheckinCapability";
import {
  FeedIssuanceCapability,
  isFeedIssuanceCapability
} from "./capabilities/FeedIssuanceCapability";
import {
  LemonadePipeline,
  isLemonadePipelineDefinition
} from "./pipelines/LemonadePipeline";
import {
  PretixPipeline,
  isPretixPipelineDefinition
} from "./pipelines/PretixPipeline";
import { Pipeline, PipelineDefinition } from "./pipelines/types";

const SERVICE_NAME = "GENERIC_ISSUANCE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export async function createPipelines(
  eddsaPrivateKey: string,
  definitions: PipelineDefinition[],
  db: IPipelineAtomDB,
  apis: {
    lemonadeAPI: ILemonadeAPI;
    // TODO: pretix api
  }
): Promise<Pipeline[]> {
  logger(LOG_TAG, `creating ${definitions.length} pipelines`);

  const pipelines: Pipeline[] = [];

  for (const definition of definitions) {
    try {
      logger(LOG_TAG, `creating pipeline ${definition.id}`);
      const pipeline = await createPipeline(
        eddsaPrivateKey,
        definition,
        db,
        apis
      );
      pipelines.push(pipeline);
      logger(LOG_TAG, `successfully created pipeline ${definition.id}`);
    } catch (e) {
      logger(LOG_TAG, `failed to create pipeline ${definition.id}`, e);
    }
  }

  return pipelines;
}

/**
 * Given a {@link PipelineDefinition} (which is persisted to the database) instantiates
 * a {@link Pipeline} so that it can be used for loading data from an external provider,
 * and expose its {@link Capability}s to the external world.
 */
export function createPipeline(
  eddsaPrivateKey: string,
  definition: PipelineDefinition,
  db: IPipelineAtomDB,
  apis: {
    lemonadeAPI: ILemonadeAPI;
    // TODO: pretix api
  }
): Pipeline {
  if (isLemonadePipelineDefinition(definition)) {
    return new LemonadePipeline(
      eddsaPrivateKey,
      definition,
      db,
      apis.lemonadeAPI
    );
  } else if (isPretixPipelineDefinition(definition)) {
    return new PretixPipeline(eddsaPrivateKey, definition, db);
  }

  throw new Error(
    `couldn't instantiate pipeline for configuration ${JSON.stringify(
      definition
    )}`
  );
}

/**
 * TODO: implement this (probably Ivan or Rob).
 * - Needs to be robust.
 * - Needs to appropriately handle creation of new pipelines.
 * - Needs to execute pipelines on some schedule
 * - Probably overall very similar to {@link DevconnectPretixSyncService}
 */
export class GenericIssuanceService {
  private context: ApplicationContext;
  private pipelines: Pipeline[];
  private definitionDB: IPipelineDefinitionDB;
  private atomDB: IPipelineAtomDB;
  private lemonadeAPI: ILemonadeAPI;
  private eddsaPrivateKey: string;
  private stytchClient: Client;
  private bypassEmail: boolean;
  private genericIssuanceClientUrl: string;

  public constructor(
    context: ApplicationContext,
    definitionDB: IPipelineDefinitionDB,
    atomDB: IPipelineAtomDB,
    lemonadeAPI: ILemonadeAPI,
    eddsaPrivateKey: string,
    stytchClient: Client,
    genericIssuanceClientUrl: string
  ) {
    this.definitionDB = definitionDB;
    this.atomDB = atomDB;
    this.context = context;
    this.lemonadeAPI = lemonadeAPI;
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.pipelines = [];
    this.stytchClient = stytchClient;
    this.genericIssuanceClientUrl = genericIssuanceClientUrl;
    this.bypassEmail =
      process.env.BYPASS_EMAIL_REGISTRATION === "true" &&
      process.env.NODE_ENV !== "production";
  }

  public async start(): Promise<void> {
    await this.createPipelines();
    await this.loadAllPipelines();
    await this.scheduleReloads();
  }

  public async loadAllPipelines(): Promise<void> {
    await Promise.allSettled(this.pipelines.map((p) => p.load()));
  }

  private async createPipelines(): Promise<void> {
    this.pipelines = [];
    const definitions = await this.definitionDB.loadPipelineDefinitions();
    const pipelines = await createPipelines(
      this.eddsaPrivateKey,
      definitions,
      this.atomDB,
      {
        lemonadeAPI: this.lemonadeAPI
      }
    );
    this.pipelines = pipelines;
  }

  private async scheduleReloads(): Promise<void> {
    // TODO
  }

  public async stop(): Promise<void> {
    return; // todo
  }

  private async getPipeline(id: string): Promise<Pipeline | undefined> {
    return this.pipelines.find((p) => p.id === id);
  }

  private async ensurePipeline(id: string): Promise<Pipeline> {
    const pipeline = await this.getPipeline(id);
    if (!pipeline) {
      throw new Error(`no pipeline with id ${id} found`);
    }
    return pipeline;
  }

  /**
   * Handles incoming requests that hit a Pipeline-specific feed for PCDs
   * for every single pipeline that has this capability that this server manages.
   *
   * TODO: better logging, honeycomb tracing
   */
  public async handlePollFeed(
    pipelineId: string,
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    const pipeline = await this.ensurePipeline(pipelineId);
    const relevantCapability = pipeline.capabilities.find(
      (c) => isFeedIssuanceCapability(c) && c.feedId === req.feedId
    ) as FeedIssuanceCapability | undefined;

    if (!relevantCapability) {
      throw new PCDHTTPError(
        403,
        `pipeline ${pipelineId} can't issue PCDs for feed id ${req.feedId}`
      );
    }

    if (!req.pcd) {
      throw new PCDHTTPError(403, `missing credential PCD in request`);
    }

    return relevantCapability.issue(req);
  }

  /**
   * Handles incoming requests that hit a Pipeline which implements the checkin
   * capability for every pipeline this server manages.
   *
   * TODO: better logging and tracing.
   */
  public async handleCheckIn(
    pipelineId: string,
    req: GenericIssuanceCheckInRequest
  ): Promise<CheckTicketInResponseValue> {
    const pipeline = await this.ensurePipeline(pipelineId);
    const relevantCapability = pipeline.capabilities.find((c) =>
      isCheckinCapability(c)
    ) as CheckinCapability | undefined;

    if (!relevantCapability) {
      throw new PCDHTTPError(
        403,
        `pipeline ${pipelineId} can't check tickets in`
      );
    }

    return relevantCapability.checkin(req);
  }

  /**
   * TODO: this probably shouldn't be public, but it was useful for testing.
   */
  public async getAllPipelines(): Promise<Pipeline[]> {
    return this.pipelines;
  }

  private getEmailFromStytchSession(session: Session): string {
    const email = session.authentication_factors.find(
      (f) => !!f.email_factor?.email_address
    )?.email_factor?.email_address;
    if (!email) {
      throw new PCDHTTPError(400, "Session did not use email authentication");
    }
    return email;
  }

  public async authenticateStytchSession(req: Request): Promise<string> {
    try {
      const { session } = await this.stytchClient.sessions.authenticateJwt({
        session_jwt: req.cookies["stytch_session_jwt"]
      });
      return this.getEmailFromStytchSession(session);
    } catch (e) {
      throw new PCDHTTPError(401, "Not authorized");
    }
  }

  public async sendLoginEmail(
    email: string
  ): Promise<GenericIssuanceSendEmailResponseValue> {
    // TODO: Skip email auth on this.bypassEmail
    try {
      await this.stytchClient.magicLinks.email.loginOrCreate({
        email,
        login_magic_link_url: this.genericIssuanceClientUrl,
        login_expiration_minutes: 10,
        signup_magic_link_url: this.genericIssuanceClientUrl,
        signup_expiration_minutes: 10
      });
    } catch (e) {
      throw new PCDHTTPError(500, "Failed to send generic issuance email");
    }
  }
}

export async function startGenericIssuanceService(
  context: ApplicationContext,
  lemonadeAPI: ILemonadeAPI | null
): Promise<GenericIssuanceService | null> {
  if (!lemonadeAPI) {
    logger(
      "[INIT] not starting generic issuance service - missing lemonade API"
    );
    return null;
  }

  const pkeyEnv = process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY;
  if (pkeyEnv == null) {
    logger(
      "[INIT] missing environment variable GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY"
    );
    return null;
  }

  const projectIdEnv = process.env.STYTCH_PROJECT_ID;
  if (projectIdEnv == null) {
    logger("[INIT] missing environment variable STYTCH_PROJECT_ID");
    return null;
  }

  const secretEnv = process.env.STYTCH_SECRET;
  if (secretEnv == null) {
    logger("[INIT] missing environment variable STYTCH_SECRET");
    return null;
  }

  const stytchClient = new stytch.Client({
    project_id: projectIdEnv,
    secret: secretEnv
  });

  const genericIssuanceClientUrl = process.env.GENERIC_ISSUANCE_CLIENT_URL;
  if (genericIssuanceClientUrl == null) {
    logger("[INIT] missing GENERIC_ISSUANCE_CLIENT_URL");
    return null;
  }

  const issuanceService = new GenericIssuanceService(
    context,
    context.pipelineDefinitionDB,
    context.pipelineAtomDB,
    lemonadeAPI,
    pkeyEnv,
    stytchClient,
    genericIssuanceClientUrl
  );

  // TODO: in the future (read: before shipping to real prod), this probably
  // shouldn't await, as there may be many many pipelines, and their APIs don't
  // necessarily return in a bounded amount of time.
  await issuanceService.start();

  return issuanceService;
}
