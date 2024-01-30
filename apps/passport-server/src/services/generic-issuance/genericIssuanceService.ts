import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
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
  definitions: PipelineDefinition[],
  db: IPipelineAtomDB,
  apis: {
    lemonadeAPI: ILemonadeAPI;
    // TODO: pretix api
  }
): Promise<Pipeline[]> {
  logger(LOG_TAG, `creating ${definitions.length} pipelines`);

  const results: Pipeline[] = [];

  for (const definition of definitions) {
    try {
      logger(LOG_TAG, `creating pipeline ${definition.id}`);
      const pipeline = await createPipeline(definition, db, apis);
      results.push(pipeline);
      logger(LOG_TAG, `successfully created pipeline ${definition.id}`);
    } catch (e) {
      logger(LOG_TAG, `failed to create pipeline ${definition.id}`, e);
    }
  }

  return results;
}

/**
 * Given a {@link PipelineDefinition} (which is persisted to the database) instantiates
 * a {@link Pipeline} so that it can be used for loading data from an external provider,
 * and expose its {@link Capability}s to the external world.
 */
export function createPipeline(
  definition: PipelineDefinition,
  db: IPipelineAtomDB,
  apis: {
    lemonadeAPI: ILemonadeAPI;
    // TODO: pretix api
  }
): Pipeline {
  if (isLemonadePipelineDefinition(definition)) {
    return new LemonadePipeline(definition, db, apis.lemonadeAPI);
  } else if (isPretixPipelineDefinition(definition)) {
    return new PretixPipeline(definition, db);
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

  public constructor(
    context: ApplicationContext,
    definitionDB: IPipelineDefinitionDB,
    atomDB: IPipelineAtomDB,
    lemonadeAPI: ILemonadeAPI
  ) {
    this.definitionDB = definitionDB;
    this.atomDB = atomDB;
    this.context = context;
    this.lemonadeAPI = lemonadeAPI;
    this.pipelines = [];
  }

  public async start(): Promise<void> {
    await this.createPipelines();
  }

  private async createPipelines(): Promise<void> {
    this.pipelines = [];
    const definitions = await this.definitionDB.loadPipelineDefinitions();
    const pipelines = await createPipelines(definitions, this.atomDB, {
      lemonadeAPI: this.lemonadeAPI
    });
    this.pipelines = pipelines;
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

  public async handlePollFeed(
    pipelineId: string,
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    const pipeline = await this.ensurePipeline(pipelineId);
    const relevantCapability = pipeline.capabilities.find(
      (c) => isFeedIssuanceCapability(c) && c.feedId === req.feedId
    ) as FeedIssuanceCapability | undefined;

    if (!relevantCapability) {
      throw new PCDHTTPError(403, `pipeline ${pipelineId} can't issue PCDs`);
    }

    if (!req.pcd) {
      throw new PCDHTTPError(403, `missing credential PCD in request`);
    }

    return relevantCapability.issue(req);
  }

  public async handleCheckIn(
    pipelineId: string,
    req: CheckTicketInRequest
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

  public async getAllPipelines(): Promise<Pipeline[]> {
    return this.pipelines;
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

  const issuanceService = new GenericIssuanceService(
    context,
    context.pipelineDefinitionDB,
    context.pipelineAtomDB,
    lemonadeAPI
  );

  await issuanceService.start();

  return issuanceService;
}
