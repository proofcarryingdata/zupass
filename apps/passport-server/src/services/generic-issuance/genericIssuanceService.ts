import {
  CheckTicketInResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { MockPipelineAtomDB } from "../../../test/generic-issuance/MockPipelineAtomDB";
import { MockPipelineDefinitionDB } from "../../../test/generic-issuance/MockPipelineDefinitionDB";
import { ILemonadeAPI } from "../../apis/lemonade/lemonadeAPI";
import { IPipelineAtomDB } from "../../database/queries/pipelineAtomDB";
import { IPipelineDefinitionDB } from "../../database/queries/pipelineDefinitionDB";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
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
    const definitions = await this.definitionDB.loadPipelineDefinitions();
    const pipelines = await createPipelines(definitions, this.atomDB, {
      lemonadeAPI: this.lemonadeAPI
    });
    this.pipelines = pipelines;
  }

  // todo
  public async stop(): Promise<void> {
    return;
  }

  // todo
  public async handlePollFeed(
    _req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return {
      actions: []
    };
  }

  // todo
  public async handleCheckIn(_req: any): Promise<CheckTicketInResponseValue> {
    return undefined;
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

  const definitionDB = new MockPipelineDefinitionDB();
  const atomDB = new MockPipelineAtomDB();

  const issuanceService = new GenericIssuanceService(
    context,
    definitionDB,
    atomDB,
    lemonadeAPI
  );

  await issuanceService.start();

  return issuanceService;
}
