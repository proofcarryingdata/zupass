import { EdDSAPublicKey, isEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  Feed,
  GenericCheckinCredentialPayload,
  GenericIssuanceCheckInRequest,
  GenericIssuanceCheckInResponseValue,
  GenericIssuancePipelineListEntry,
  GenericIssuancePreCheckRequest,
  GenericIssuancePreCheckResponseValue,
  GenericIssuanceSendEmailResponseValue,
  ListFeedsResponseValue,
  PipelineDefinition,
  PipelineDefinitionSchema,
  PipelineFeedInfo,
  PipelineInfoResponseValue,
  PipelineRunInfo,
  PipelineType,
  PollFeedRequest,
  PollFeedResponseValue,
  PretixPipelineDefinition
} from "@pcd/passport-interface";
import { PCDPermissionType } from "@pcd/pcd-collection";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { randomUUID } from "crypto";
import { Request } from "express";
import stytch, { Client, Session } from "stytch";
import { v4 as uuidV4 } from "uuid";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../apis/pretix/genericPretixAPI";
import { IPipelineAtomDB } from "../../database/queries/pipelineAtomDB";
import {
  IPipelineDefinitionDB,
  PipelineDefinitionDB
} from "../../database/queries/pipelineDefinitionDB";
import {
  IPipelineUserDB,
  PipelineUserDB
} from "../../database/queries/pipelineUserDB";
import { sqlQuery } from "../../database/sqlQuery";
import { PCDHTTPError } from "../../routing/pcdHttpError";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import { RollbarService } from "../rollbarService";
import { setError, traced } from "../telemetryService";
import { isCheckinCapability } from "./capabilities/CheckinCapability";
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
import { Pipeline, PipelineUser } from "./pipelines/types";
import { makePLogErr } from "./util";

const SERVICE_NAME = "GENERIC_ISSUANCE";
const LOG_TAG = `[${SERVICE_NAME}]`;

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
 * It's not always possible to start a {@link Pipeline} given a {@link PipelineDefinition}
 * because a pipeline could be misconfigured.
 *
 * An {@link InMemoryPipeline} is used to represent a pair of {@link PipelineDefinition} and
 * its corresponding {@link Pipeline} if one was able to be started.
 */
export interface InMemoryPipeline {
  definition: PipelineDefinition;
  pipeline?: Pipeline;
}

export class GenericIssuanceService {
  /**
   * The pipeline data reload algorithm works as follows:
   * 1. concurrently load all data for all pipelines
   * 2. save that data
   * 3. wait {@link PIPELINE_REFRESH_INTERVAL_MS} milliseconds
   * 4. go back to step one
   */
  private static readonly PIPELINE_REFRESH_INTERVAL_MS = 60_000;

  private context: ApplicationContext;
  private rollbarService: RollbarService | null;

  private userDB: IPipelineUserDB;
  private definitionDB: IPipelineDefinitionDB;
  private atomDB: IPipelineAtomDB;

  private lemonadeAPI: ILemonadeAPI;
  private genericPretixAPI: IGenericPretixAPI;
  private stytchClient: Client;

  private genericIssuanceClientUrl: string;
  private eddsaPrivateKey: string;
  private zupassPublicKey: EdDSAPublicKey;
  private bypassEmail: boolean;
  private pipelines: InMemoryPipeline[];
  private nextLoadTimeout: NodeJS.Timeout | undefined;
  private stopped = false;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    atomDB: IPipelineAtomDB,
    lemonadeAPI: ILemonadeAPI,
    stytchClient: Client,
    genericIssuanceClientUrl: string,
    pretixAPI: IGenericPretixAPI,
    eddsaPrivateKey: string,
    zupassPublicKey: EdDSAPublicKey
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.userDB = new PipelineUserDB(context.dbPool);
    this.definitionDB = new PipelineDefinitionDB(context.dbPool);
    this.atomDB = atomDB;
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
    try {
      await this.maybeInsertLocalDevTestPipeline();
      await this.maybeSetupAdmins();
      await this.startPipelinesFromDefinitions();
      this.schedulePipelineLoadLoop();
    } catch (e) {
      this.rollbarService?.reportError(e);
      logger(LOG_TAG, "error starting GenericIssuanceService", e);
    }
  }

  public async stop(): Promise<void> {
    if (this.stopped) {
      logger(LOG_TAG, "already stopped - not stopping");
      return;
    }

    logger(LOG_TAG, "stopping");

    this.stopped = true;
    if (this.nextLoadTimeout) {
      clearTimeout(this.nextLoadTimeout);
      this.nextLoadTimeout = undefined;
    }
  }

  public async startPipelinesFromDefinitions(): Promise<void> {
    return traced(
      SERVICE_NAME,
      "startPipelinesFromDefinitions",
      async (span) => {
        const pipelinesFromDB =
          await this.definitionDB.loadPipelineDefinitions();

        span?.setAttribute("pipeline_count", pipelinesFromDB.length);

        await Promise.allSettled(
          this.pipelines.map(async (entry) => {
            if (entry.pipeline) {
              await entry.pipeline.stop();
            }
          })
        );

        this.pipelines = await Promise.all(
          pipelinesFromDB.map(async (definition: PipelineDefinition) => {
            const result: InMemoryPipeline = {
              definition
            };

            try {
              const pipeline = createPipeline(
                this.eddsaPrivateKey,
                definition,
                this.atomDB,
                {
                  lemonadeAPI: this.lemonadeAPI,
                  genericPretixAPI: this.genericPretixAPI
                },
                this.zupassPublicKey
              );
              result.pipeline = pipeline;
            } catch (e) {
              this.rollbarService?.reportError(e);
              logger(LOG_TAG, "failed to create pipeline", e);
              setError(e, span);
            }

            return result;
          })
        );
      }
    );
  }

  private async executeSinglePipeline(
    inMemoryPipeline: InMemoryPipeline
  ): Promise<PipelineRunInfo> {
    return traced<PipelineRunInfo>(
      SERVICE_NAME,
      "executeSinglePipeline",
      async (span): Promise<PipelineRunInfo> => {
        const start = Date.now();
        const pipelineId = inMemoryPipeline.definition.id;
        const pipeline = inMemoryPipeline.pipeline;

        if (!pipeline) {
          logger(
            LOG_TAG,
            `pipeline ${pipelineId} is not running; skipping loading`
          );
          return {
            lastRunStartTimestamp: start,
            lastRunEndTimestamp: start,
            latestLogs: [makePLogErr("failed to start pipeline")],
            atomsLoaded: 0
          };
        }

        try {
          logger(LOG_TAG, `loading data for pipeline with id '${pipelineId}'`);
          const result = await pipeline.load();
          logger(
            LOG_TAG,
            `successfully loaded data for pipeline with id '${pipelineId}'`,
            result
          );
          return result;
        } catch (e) {
          this.rollbarService?.reportError(e);
          logger(LOG_TAG, `failed to load pipeline '${pipelineId}'`, e);
          setError(e, span);
          return {
            lastRunStartTimestamp: start,
            lastRunEndTimestamp: Date.now(),
            latestLogs: [makePLogErr(`failed to start pipeline: ${e + ""}`)],
            atomsLoaded: 0
          };
        }
      }
    );
  }

  public async executeAllPipelineLoads(): Promise<void> {
    return traced(SERVICE_NAME, "executeAllPipelineLoads", async (span) => {
      const pipelineIds = JSON.stringify(
        this.pipelines.map((p) => p.definition.id)
      );
      logger(
        LOG_TAG,
        `loading data for ${this.pipelines.length} pipelines. ids are: ${pipelineIds}`
      );
      span?.setAttribute("pipeline_ids", pipelineIds);

      await Promise.allSettled(
        this.pipelines.map(
          async (inMemoryPipeline: InMemoryPipeline): Promise<void> => {
            const runInfo = await this.executeSinglePipeline(inMemoryPipeline);
            this.definitionDB.saveLastRunInfo(
              inMemoryPipeline.definition.id,
              runInfo
            );
          }
        )
      );
    });
  }

  /**
   * Loads all data for all pipelines (that have been started). Waits 60s,
   * then loads all data for all loaded pipelines again.
   */
  private async schedulePipelineLoadLoop(): Promise<void> {
    return traced(SERVICE_NAME, "schedulePipelineLoadLoop", async (span) => {
      logger(LOG_TAG, "refreshing pipeline datas");

      try {
        await this.executeAllPipelineLoads();
        logger(LOG_TAG, "pipeline datas refreshed");
      } catch (e) {
        this.rollbarService?.reportError(e);
        logger(LOG_TAG, "pipeline datas failed to refresh", e);
        setError(e, span);
      }

      if (this.stopped) {
        return;
      }

      logger(
        LOG_TAG,
        "scheduling next pipeline refresh for",
        Math.floor(GenericIssuanceService.PIPELINE_REFRESH_INTERVAL_MS / 1000),
        "s from now"
      );

      this.nextLoadTimeout = setTimeout(() => {
        if (this.stopped) {
          return;
        }
        this.schedulePipelineLoadLoop();
      }, GenericIssuanceService.PIPELINE_REFRESH_INTERVAL_MS);
    });
  }

  private async getPipeline(id: string): Promise<Pipeline | undefined> {
    return this.pipelines.find((p) => p.definition.id === id)?.pipeline;
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
   * TODO: better logging
   */
  public async handlePollFeed(
    pipelineId: string,
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return traced(SERVICE_NAME, "handlePollFeed", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);
      span?.setAttribute("feed_id", req.feedId);

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
    });
  }

  public async handleGetPipelineInfo(
    pipelineId: string
  ): Promise<PipelineInfoResponseValue> {
    const pipeline = await this.ensurePipeline(pipelineId);
    const feeds = pipeline.capabilities.filter(isFeedIssuanceCapability);
    const infos: PipelineFeedInfo[] = feeds.map((f) => ({
      name: f.options.feedDisplayName,
      url: f.feedUrl
    }));

    const latestRun = await this.definitionDB.getLastRunInfo(pipeline.id);
    const latestAtoms = await this.atomDB.load(pipeline.id);

    const response: PipelineInfoResponseValue = {
      feeds: infos,
      latestAtoms: latestAtoms,
      latestRun: latestRun
    };

    return response;
  }

  public async handleListFeed(
    pipelineId: string,
    feedId: string
  ): Promise<ListFeedsResponseValue> {
    return traced(SERVICE_NAME, "handleListFeed", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);
      span?.setAttribute("feed_id", feedId);

      const pipeline: Pipeline = await this.ensurePipeline(pipelineId);
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
        providerName: "PCD-ifier",
        providerUrl: relevantCapability.feedUrl
      };

      return res;
    });
  }

  /**
   * Handles incoming requests that hit a Pipeline which implements the checkin
   * capability for every pipeline this server manages.
   *
   * TODO: better logging and tracing.
   */
  public async handleCheckIn(
    req: GenericIssuanceCheckInRequest
  ): Promise<GenericIssuanceCheckInResponseValue> {
    return traced(SERVICE_NAME, "handleCheckIn", async (span) => {
      // This is sub-optimal, but since tickets do not identify the pipelines
      // they come from, we have to match the ticket to the pipeline this way.
      const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
        req.credential.pcd
      );
      const signaturePCDValid =
        await SemaphoreSignaturePCDPackage.verify(signaturePCD);

      if (!signaturePCDValid) {
        throw new Error("credential signature invalid");
      }

      const payload: GenericCheckinCredentialPayload = JSON.parse(
        signaturePCD.claim.signedMessage
      );

      const eventId = payload.eventId;
      // TODO detect mismatch between eventId and ticketId?

      span?.setAttribute("event_id", eventId);

      for (const pipeline of this.pipelines) {
        if (!pipeline.pipeline) {
          continue;
        }

        for (const capability of pipeline?.pipeline.capabilities) {
          if (
            isCheckinCapability(capability) &&
            capability.canHandleCheckinForEvent(eventId)
          ) {
            span?.setAttribute("pipeline_id", pipeline.definition.id);
            span?.setAttribute("pipeline_type", pipeline.definition.type);
            return await capability.checkin(req);
          }
        }
      }

      throw new PCDHTTPError(
        403,
        `can't find pipeline to check-in for event ${eventId}`
      );
    });
  }

  /**
   * Checks that a ticket could be checked in by the current user.
   */
  public async handlePreCheck(
    req: GenericIssuancePreCheckRequest
  ): Promise<GenericIssuancePreCheckResponseValue> {
    return traced(SERVICE_NAME, "handlePreCheck", async (span) => {
      // This is sub-optimal, but since tickets do not identify the pipelines
      // they come from, we have to match the ticket to the pipeline this way.
      const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
        req.credential.pcd
      );
      const signaturePCDValid =
        await SemaphoreSignaturePCDPackage.verify(signaturePCD);

      if (!signaturePCDValid) {
        throw new Error("credential signature invalid");
      }

      const payload: GenericCheckinCredentialPayload = JSON.parse(
        signaturePCD.claim.signedMessage
      );

      const eventId = payload.eventId;
      span?.setAttribute("event_id", eventId);

      for (const pipeline of this.pipelines) {
        if (!pipeline.pipeline) {
          continue;
        }

        for (const capability of pipeline.pipeline.capabilities) {
          if (
            isCheckinCapability(capability) &&
            capability.canHandleCheckinForEvent(eventId)
          ) {
            span?.setAttribute("pipeline_id", pipeline.definition.id);
            span?.setAttribute("pipeline_type", pipeline.definition.type);
            return await capability.preCheck(req);
          }
        }
      }

      throw new PCDHTTPError(
        403,
        `can't find pipeline to check-in for event ${eventId}`
      );
    });
  }

  public async getAllUserPipelineDefinitions(
    userId: string
  ): Promise<GenericIssuancePipelineListEntry[]> {
    const allDefinitions: PipelineDefinition[] =
      await this.definitionDB.loadPipelineDefinitions();

    const user = await this.userDB.getUser(userId);

    const relevantPipelines = allDefinitions.filter((d) =>
      this.userHasPipelineDefinitionAccess(user, d)
    );

    return Promise.all(
      relevantPipelines.map(async (p) => {
        const owner = await this.userDB.getUser(p.ownerUserId);
        if (!owner) {
          throw new Error(`couldn't load user for id '${p.ownerUserId}'`);
        }

        return {
          extraInfo: {
            ownerEmail: owner.email
          },
          pipeline: p
        };
      })
    );
  }

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

  public async getPipelineDefinition(
    userId: string,
    pipelineId: string
  ): Promise<PipelineDefinition> {
    const pipeline = await this.definitionDB.getDefinition(pipelineId);
    const user = await this.userDB.getUser(userId);
    if (!pipeline || !this.userHasPipelineDefinitionAccess(user, pipeline))
      throw new PCDHTTPError(404, "Pipeline not found or not accessible");
    return pipeline;
  }

  public async upsertPipelineDefinition(
    userId: string,
    pipelineDefinition: PipelineDefinition
  ): Promise<PipelineDefinition> {
    return traced(SERVICE_NAME, "upsertPipelineDefinition", async (span) => {
      span?.setAttribute("user_id", userId);
      span?.setAttribute(
        "pipeline_definition",
        JSON.stringify(pipelineDefinition)
      );

      const existingPipelineDefinition = await this.definitionDB.getDefinition(
        pipelineDefinition.id
      );
      const user = await this.userDB.getUser(userId);

      if (existingPipelineDefinition) {
        if (
          !this.userHasPipelineDefinitionAccess(
            user,
            existingPipelineDefinition
          )
        ) {
          throw new PCDHTTPError(403, "Not allowed to edit pipeline");
        }
        if (
          existingPipelineDefinition.ownerUserId !==
          pipelineDefinition.ownerUserId
        ) {
          throw new PCDHTTPError(400, "Cannot change owner of pipeline");
        }
      } else {
        pipelineDefinition.ownerUserId = userId;
        if (!pipelineDefinition.id) {
          pipelineDefinition.id = uuidV4();
        }
      }

      let newPipelineDefinition: PipelineDefinition;
      try {
        newPipelineDefinition = PipelineDefinitionSchema.parse(
          pipelineDefinition
        ) as PipelineDefinition;
      } catch (e) {
        throw new PCDHTTPError(400, `Invalid formatted response: ${e}`);
      }

      await this.definitionDB.setDefinition(newPipelineDefinition);
      await this.restartPipeline(newPipelineDefinition.id);
      return newPipelineDefinition;
    });
  }

  public async deletePipelineDefinition(
    userId: string,
    pipelineId: string
  ): Promise<undefined> {
    return traced(SERVICE_NAME, "deletePipelineDefinition", async (span) => {
      span?.setAttribute("user_id", userId);
      span?.setAttribute("pipeline_id", pipelineId);
      const pipeline = await this.getPipelineDefinition(userId, pipelineId);
      // TODO: Finalize the "permissions model" for CRUD actions. Right now,
      // create, read, update are permissable by owners and editors, while delete
      // is only permissable by owners.
      if (pipeline.ownerUserId !== userId) {
        throw new PCDHTTPError(403, "Need to be owner to delete pipeline");
      }
      await this.definitionDB.clearDefinition(pipelineId);
      await this.restartPipeline(pipelineId);
      return undefined;
    });
  }

  /**
   * Makes sure that the pipeline that's running on the server
   * for the given id is based off the latest pipeline configuration
   * stored in the database.
   *
   * If a pipeline with the given definition does not exists in the database
   * makes sure that no pipeline for it is running on the server.
   */
  private async restartPipeline(pipelineId: string): Promise<void> {
    return traced(SERVICE_NAME, "restartPipeline", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);

      const inMemoryPipeline = this.pipelines.find(
        (p) => p.definition.id === pipelineId
      );
      if (inMemoryPipeline) {
        // we're going to need to stop the pipeline for this
        // definition, so we do that right at the beginning
        this.pipelines = this.pipelines.filter(
          (p) => p.definition.id !== pipelineId
        );
        await inMemoryPipeline.pipeline?.stop();
      }

      const definitionInDB = await this.definitionDB.getDefinition(pipelineId);

      if (definitionInDB) {
        const pipeline = createPipeline(
          this.eddsaPrivateKey,
          definitionInDB,
          this.atomDB,
          {
            genericPretixAPI: this.genericPretixAPI,
            lemonadeAPI: this.lemonadeAPI
          },
          this.zupassPublicKey
        );

        this.pipelines.push({
          pipeline: pipeline,
          definition: definitionInDB
        } satisfies InMemoryPipeline);

        logger(LOG_TAG, `loading data for updated pipeline ${pipeline.id}`);

        pipeline
          .load()
          .then(() => {
            logger(LOG_TAG, `loaded data for updated pipeline ${pipeline.id}`);
          })
          .catch((e) => {
            logger(
              LOG_TAG,
              `failed to load data for updated pipeline ${pipeline.id}`,
              e
            );
            setError(e, span);
          });
      }
    });
  }

  public async createOrGetUser(email: string): Promise<PipelineUser> {
    return traced(SERVICE_NAME, "createOrGetUser", async (span) => {
      span?.setAttribute("email", email);
      const existingUser = await this.userDB.getUserByEmail(email);
      if (existingUser != null) {
        return existingUser;
      }
      const newUser: PipelineUser = {
        id: uuidV4(),
        email,
        isAdmin: false
      };
      this.userDB.setUser(newUser);
      return newUser;
    });
  }

  /**
   * TODO: this probably shouldn't be public, but it was useful for testing.
   */
  public async getAllPipelines(): Promise<Pipeline[]> {
    return this.pipelines
      .map((p) => p.pipeline)
      .filter((p) => !!p) as Pipeline[];
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

  public async authenticateStytchSession(req: Request): Promise<PipelineUser> {
    try {
      const reqBody = req.body;
      const jwt = reqBody.jwt;

      const { session } = await this.stytchClient.sessions.authenticateJwt({
        session_jwt: jwt
      });
      const email = this.getEmailFromStytchSession(session);
      const user = await this.createOrGetUser(email);
      return user;
    } catch (e) {
      throw new PCDHTTPError(401, "Not authorized");
    }
  }

  public async sendLoginEmail(
    email: string
  ): Promise<GenericIssuanceSendEmailResponseValue> {
    return traced(SERVICE_NAME, "sendLoginEmail", async (span) => {
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
        setError(e, span);
        logger(LOG_TAG, `failed to send login email`, e);
        throw new PCDHTTPError(500, "Failed to send generic issuance email");
      }

      return undefined;
    });
  }

  private async maybeSetupAdmins(): Promise<void> {
    try {
      if (!process.env.GENERIC_ISSUANCE_ADMINS) {
        return;
      }

      const adminEmailsFromEnv: string[] = JSON.parse(
        process.env.GENERIC_ISSUANCE_ADMINS
      );

      if (!(adminEmailsFromEnv instanceof Array)) {
        throw new Error(
          `expected environment variable 'GENERIC_ISSUANCE_ADMINS' ` +
            `to be an array of strings`
        );
      }

      logger(LOG_TAG, `setting up generic issuance admins`, adminEmailsFromEnv);

      for (const email of adminEmailsFromEnv) {
        await this.userDB.setUserAdmin(email, true);
      }
    } catch (e) {
      logger(LOG_TAG, `failed to set up generic issuance admins`, e);
    }
  }

  /**
   * in local development, set the `TEST_PRETIX_KEY` and `TEST_PRETIX_ORG_URL` env
   * variables to the ones that Ivan shares with you to set up a Pretix pipeline.
   */
  public async maybeInsertLocalDevTestPipeline(): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    logger("[INIT] attempting to create test pipeline data");

    const testPretixAPIKey = process.env.TEST_PRETIX_KEY;
    const testPretixOrgUrl = process.env.TEST_PRETIX_ORG_URL;
    const createTestPretixPipeline = process.env.CREATE_TEST_PIPELINE;

    if (!createTestPretixPipeline || !testPretixAPIKey || !testPretixOrgUrl) {
      logger("[INIT] not creating test pipeline data - missing env vars");
      return;
    }

    const existingPipelines = await this.definitionDB.loadPipelineDefinitions();
    if (existingPipelines.length !== 0) {
      logger("[INIT] there's already a pipeline - not creating test pipeline");
      return;
    }

    const ownerUUID = randomUUID();

    await sqlQuery(
      this.context.dbPool,
      "INSERT INTO generic_issuance_users VALUES($1, $2, $3)",
      [ownerUUID, "test@example.com", true]
    );

    const pretixDefinitionId = "3d6d4c8e-4228-423e-9b0a-33709aa1b468";

    const pretixDefinition: PretixPipelineDefinition = {
      ownerUserId: ownerUUID,
      id: pretixDefinitionId,
      editorUserIds: [],
      options: {
        feedOptions: {
          feedDescription: "progcrypto test tickets",
          feedDisplayName: "progcrypto",
          feedFolder: "generic/progcrypto",
          feedId: "0"
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
                isSuperUser: true
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
  rollbarService: RollbarService | null,
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
    rollbarService,
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
