import { Router } from "express";
import { MockPipelineAtomDB } from "../../../test/generic-issuance/MockPipelineAtomDB";
import { MockPipelineDefinitionDB } from "../../../test/generic-issuance/MockPipelineDefinitionDB";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IPipelineAtomDB } from "../../database/queries/pipelineAtomDB";
import { IPipelineDefinitionDB } from "../../database/queries/pipelineDefinitionDB";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import {
  isCheckinCapability,
  setupCheckinCapabilityRoutes
} from "./capabilities/CheckinCapability";
import {
  isFeedIssuanceCapability,
  setupFeedCapabilityRoutes
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
import { BasePipelineCapability } from "./types";

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
 * Given a set of instantiated {@link Pipeline}s, creates routes that handle
 * external HTTP requests.
 */
export async function setupRoutesForPipelines(
  router: Router,
  pipelines: Pipeline[]
): Promise<void> {
  for (const pipeline of pipelines) {
    for (const capability of pipeline.capabilities) {
      await setupRoutesForCapability(router, pipeline, capability);
    }
  }
}

/**
 * TODO:
 * - probably move to a different file than this
 */
export async function setupRoutesForCapability(
  router: Router,
  pipeline: Pipeline,
  capability: BasePipelineCapability
): Promise<void> {
  if (isFeedIssuanceCapability(capability)) {
    setupFeedCapabilityRoutes(router, pipeline, capability);
  } else if (isCheckinCapability(capability)) {
    setupCheckinCapabilityRoutes(router, pipeline, capability);
  } else {
    logger(
      `pipeline ${pipeline.id} capability ${capability} doesn't have a router`
    );
  }
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

  public constructor(
    context: ApplicationContext,
    definitionDB: IPipelineDefinitionDB,
    atomDB: IPipelineAtomDB
  ) {
    this.definitionDB = definitionDB;
    this.atomDB = atomDB;
    this.context = context;
    this.pipelines = [];
  }

  public async start(): Promise<void> {
    const definitions = await this.definitionDB.loadPipelineDefinitions();
  }

  public async stop(): Promise<void> {
    // todo
  }
}

export async function startGenericIssuanceService(
  context: ApplicationContext
): Promise<GenericIssuanceService> {
  const definitionDB = new MockPipelineDefinitionDB();
  const atomDB = new MockPipelineAtomDB();

  const issuanceService = new GenericIssuanceService(
    context,
    definitionDB,
    atomDB
  );

  await issuanceService.start();

  return issuanceService;
}
