import { EdDSAPublicKey, isEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CheckTicketInResponseValue,
  Feed,
  GenericIssuanceCheckInRequest,
  GenericIssuanceSendEmailResponseValue,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDPermissionType } from "@pcd/pcd-collection";
import { randomUUID } from "crypto";
import { Request } from "express";
import stytch, { Client, Session } from "stytch";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../apis/pretix/genericPretixAPI";
import { IPipelineAtomDB } from "../../database/queries/pipelineAtomDB";
import {
  IPipelineDefinitionDB,
  PipelineDefinitionDB
} from "../../database/queries/pipelineDefinitionDB";
import { sqlQuery } from "../../database/sqlQuery";
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
  PretixPipelineDefinition,
  isPretixPipelineDefinition
} from "./pipelines/PretixPipeline";
import { Pipeline, PipelineDefinition, PipelineType } from "./pipelines/types";

const SERVICE_NAME = "GENERIC_ISSUANCE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export async function createPipelines(
  eddsaPrivateKey: string,
  definitions: PipelineDefinition[],
  db: IPipelineAtomDB,
  apis: {
    lemonadeAPI: ILemonadeAPI;
    genericPretixAPI: IGenericPretixAPI;
  },
  zupassPublicKey: EdDSAPublicKey
): Promise<Pipeline[]> {
  logger(LOG_TAG, `creating ${definitions.length} pipelines`);

  const pipelines: Pipeline[] = [];

  for (const definition of definitions) {
    try {
      logger(LOG_TAG, `creating pipeline ${definition.id}`, definition);
      const pipeline = createPipeline(
        eddsaPrivateKey,
        definition,
        db,
        apis,
        zupassPublicKey
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
    genericPretixAPI: IGenericPretixAPI;
  },
  zupassPublicKey: EdDSAPublicKey
): Pipeline {
  if (isLemonadePipelineDefinition(definition)) {
    return new LemonadePipeline(
      eddsaPrivateKey,
      definition,
      db,
      apis.lemonadeAPI,
      zupassPublicKey
    );
  } else if (isPretixPipelineDefinition(definition)) {
    return new PretixPipeline(
      eddsaPrivateKey,
      definition,
      db,
      apis.genericPretixAPI,
      zupassPublicKey
    );
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
  private genericPretixAPI: IGenericPretixAPI;
  private eddsaPrivateKey: string;
  private stytchClient: Client;
  private bypassEmail: boolean;
  private genericIssuanceClientUrl: string;
  private zupassPublicKey: EdDSAPublicKey;

  public constructor(
    context: ApplicationContext,
    atomDB: IPipelineAtomDB,
    lemonadeAPI: ILemonadeAPI,
    stytchClient: Client,
    genericIssuanceClientUrl: string,
    pretixAPI: IGenericPretixAPI,
    eddsaPrivateKey: string,
    zupassPublicKey: EdDSAPublicKey
  ) {
    this.definitionDB = new PipelineDefinitionDB(context.dbPool);
    this.atomDB = atomDB;
    this.context = context;
    this.lemonadeAPI = lemonadeAPI;
    this.genericPretixAPI = pretixAPI;
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.pipelines = [];
    this.stytchClient = stytchClient;
    this.genericIssuanceClientUrl = genericIssuanceClientUrl;
    this.bypassEmail =
      process.env.BYPASS_EMAIL_REGISTRATION === "true" &&
      process.env.NODE_ENV !== "production";
    this.zupassPublicKey = zupassPublicKey;
  }

  public async start(): Promise<void> {
    await this.localDevCreateTestPipeline();
    await this.loadPipelines();
    setTimeout(async () => {
      try {
        await this.loadPipelineData();
      } catch (e) {
        logger(LOG_TAG, e);
      }
    });
  }

  public async loadPipelineData(): Promise<void> {
    logger(LOG_TAG, "loading data for all pipelines", this.pipelines.length);

    await Promise.allSettled(
      this.pipelines.map(async (p) => {
        try {
          logger(LOG_TAG, `loading for pipeline with id ${p.id}`);
          await p.load();
          logger(LOG_TAG, `successfully loaded pipeline with id ${p.id}`);
        } catch (e) {
          logger(LOG_TAG, `failed to load pipeline ${p.id}`, e);
        }
      })
    );

    await this.scheduleReloads();
  }

  public async loadPipelines(): Promise<void> {
    this.pipelines = [];
    const definitions = await this.definitionDB.loadPipelineDefinitions();
    const pipelines = await createPipelines(
      this.eddsaPrivateKey,
      definitions,
      this.atomDB,
      {
        lemonadeAPI: this.lemonadeAPI,
        genericPretixAPI: this.genericPretixAPI
      },
      this.zupassPublicKey
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
      (c) => isFeedIssuanceCapability(c) && c.options.feedId === req.feedId
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

  public async handleListFeed(
    pipelineId: string,
    feedId: string
  ): Promise<ListFeedsResponseValue> {
    const pipeline = await this.ensurePipeline(pipelineId);
    const relevantCapability = pipeline.capabilities.find(
      (c) => isFeedIssuanceCapability(c) && c.options.feedId === feedId
    ) as FeedIssuanceCapability | undefined;

    if (!relevantCapability) {
      throw new PCDHTTPError(
        403,
        `pipeline ${pipelineId} can't issue PCDs for feed id ${feedId}`
      );
    }

    const feed: Feed = {
      id: feedId,
      name: relevantCapability.options.feedDisplayName,
      description: relevantCapability.options.feedDescription,
      permissions: [
        {
          folder: relevantCapability.options.feedFolder,
          type: PCDPermissionType.AppendToFolder
        },
        {
          folder: relevantCapability.options.feedFolder,
          type: PCDPermissionType.ReplaceInFolder
        }
      ],
      credentialRequest: {
        signatureType: "sempahore-signature-pcd",
        pcdType: "email-pcd"
      }
    };

    const res: ListFeedsResponseValue = {
      feeds: [feed],
      providerName: relevantCapability.options.providerName,
      providerUrl: relevantCapability.feedUrl
    };

    return res;
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

  /**
   * in local development, set the `TEST_PRETIX_KEY` and `TEST_PRETIX_ORG_URL` env
   * variables to the ones that Ivan shares with you to set up a Pretix pipeline.
   */
  public async localDevCreateTestPipeline(): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const existingPipelines = await this.definitionDB.loadPipelineDefinitions();

    if (existingPipelines.length !== 0) {
      logger("[INIT] there's already a pipeline - not creating test pipeline");
      return;
    }

    const testPretixAPIKey = process.env.TEST_PRETIX_KEY;
    const testPretixOrgUrl = process.env.TEST_PRETIX_ORG_URL;

    if (!testPretixAPIKey || !testPretixOrgUrl) {
      logger("[INIT] not creating test pipeline data - missing env vars");
      return;
    }

    logger("[INIT] attempting to create test pipeline data");

    const ownerUUID = randomUUID();

    await sqlQuery(
      this.context.dbPool,
      "INSERT INTO generic_issuance_users VALUES($1, $2, $3)",
      [ownerUUID, "test@example.com", true]
    );

    const pretixDefinition: PretixPipelineDefinition = {
      ownerUserId: ownerUUID,
      id: randomUUID(),
      editorUserIds: [],
      options: {
        feedOptions: {
          feedDescription: "progcrypto test tickets",
          feedDisplayName: "progcrypto",
          feedFolder: "generic/progcrypto",
          feedId: "0",
          providerName: "generic issuance"
        },
        events: [
          {
            genericIssuanceId: randomUUID(),
            externalId: "progcrypto",
            name: "ProgCrypto (Internal Test)",
            products: [
              {
                externalId: "369803",
                name: "GA",
                genericIssuanceId: randomUUID(),
                isSuperUser: false
              },
              {
                externalId: "374045",
                name: "Organizer",
                genericIssuanceId: randomUUID(),
                isSuperUser: false
              }
            ]
          }
        ],
        pretixAPIKey: testPretixAPIKey,
        pretixOrgUrl: testPretixOrgUrl
      },
      type: PipelineType.Pretix
    };

    await this.definitionDB.setDefinition(pretixDefinition);
  }
}

export async function startGenericIssuanceService(
  context: ApplicationContext,
  lemonadeAPI: ILemonadeAPI | null,
  genericPretixAPI: IGenericPretixAPI | null
): Promise<GenericIssuanceService | null> {
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
    context.pipelineAtomDB,
    lemonadeAPI,
    stytchClient,
    genericIssuanceClientUrl,
    genericPretixAPI,
    pkeyEnv,
    zupassPublicKey
  );

  issuanceService.start();

  return issuanceService;
}
