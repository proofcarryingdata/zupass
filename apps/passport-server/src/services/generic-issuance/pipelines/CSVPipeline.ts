import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CSVPipelineDefinition,
  PipelineRunInfo,
  PipelineType
} from "@pcd/passport-interface";
import { IPipelineAtomDB } from "../../../database/queries/pipelineAtomDB";
import { logger } from "../../../util/logger";
import { BasePipelineCapability } from "../types";
import { BasePipeline, Pipeline } from "./types";

const LOG_NAME = "CSVPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export class CSVPipeline implements BasePipeline {
  public type = PipelineType.CSV;
  public capabilities: BasePipelineCapability[] = [];

  private eddsaPrivateKey: string;
  private db: IPipelineAtomDB;
  private definition: CSVPipelineDefinition;
  private zupassPublicKey: EdDSAPublicKey;

  public get id(): string {
    return this.definition.id;
  }

  public constructor(
    eddsaPrivateKey: string,
    definition: CSVPipelineDefinition,
    db: IPipelineAtomDB,
    zupassPublicKey: EdDSAPublicKey
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB;
    this.zupassPublicKey = zupassPublicKey;
  }

  public async load(): Promise<PipelineRunInfo> {
    return {
      atomsLoaded: 0,
      lastRunEndTimestamp: Date.now(),
      lastRunStartTimestamp: Date.now(),
      latestLogs: [],
      success: true
    };
  }

  public async stop(): Promise<void> {
    logger(LOG_TAG, `stopping csv pipeline`);
  }

  public static is(pipeline: Pipeline): pipeline is CSVPipeline {
    return pipeline.type === PipelineType.CSV;
  }
}
