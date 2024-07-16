import {
  PODPipelineDefinition,
  PODPipelineInputType,
  PipelineLoadSummary,
  PipelineLog,
  PipelineType
} from "@pcd/passport-interface";
import { PODEntries } from "@pcd/pod";
import { assertUnreachable } from "@pcd/util";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../../database/queries/pipelineAtomDB";
import { IPipelineConsumerDB } from "../../../../database/queries/pipelineConsumerDB";
import { IPipelineSemaphoreHistoryDB } from "../../../../database/queries/pipelineSemaphoreHistoryDB";
import { logger } from "../../../../util/logger";
import { traced } from "../../../telemetryService";
import { SemaphoreGroupProvider } from "../../SemaphoreGroupProvider";
import { tracePipeline } from "../../honeycombQueries";
import { CredentialSubservice } from "../../subservices/CredentialSubservice";
import { BasePipeline } from "../types";
import { CSVInput } from "./CSVInput";
import { Input } from "./Input";

const LOG_NAME = "PODPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export interface PODAtom extends PipelineAtom {
  /**
   * @todo matchType should be an enum
   */
  matchTo: { entry: string; matchType: string };
  outputId: string;
  entries: PODEntries;
}

export class PODPipeline implements BasePipeline {
  public type = PipelineType.POD;
  public capabilities = [];

  private eddsaPrivateKey: string;
  private db: IPipelineAtomDB<PODAtom>;
  private definition: PODPipelineDefinition;
  private credentialSubservice: CredentialSubservice;
  private semaphoreGroupProvider?: SemaphoreGroupProvider;
  private consumerDB: IPipelineConsumerDB;

  public constructor(
    eddsaPrivateKey: string,
    definition: PODPipelineDefinition,
    db: IPipelineAtomDB<PODAtom>,
    credentialSubservice: CredentialSubservice,
    semaphoreHistoryDB: IPipelineSemaphoreHistoryDB,
    consumerDB: IPipelineConsumerDB
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db;
    this.credentialSubservice = credentialSubservice;
    //  this.semaphoreGroupProvider = new SemaphoreGroupProvider(semaphoreHistoryDB);
    this.consumerDB = consumerDB;
  }

  public async load(): Promise<PipelineLoadSummary> {
    return traced(LOG_NAME, "load", async (_span) => {
      tracePipeline(this.definition);
      logger(LOG_TAG, "load", this.definition.id, this.definition.type);

      const start = new Date();
      const input = PODPipeline.loadInput(this.definition);

      const logs: PipelineLog[] = [];

      const end = new Date();

      return {
        lastRunStartTimestamp: start.toISOString(),
        lastRunEndTimestamp: end.toISOString(),
        latestLogs: logs,
        atomsLoaded: 0,
        atomsExpected: 0,
        success: true
      } satisfies PipelineLoadSummary;
    });
  }

  public async start(): Promise<void> {
    logger(`Starting POD Pipeline ${this.definition.id}`);
  }

  public async stop(): Promise<void> {
    logger(`Stopping POD Pipeline ${this.definition.id}`);
  }

  /**
   *
   * @param definition
   * @returns
   */
  public static loadInput(definition: PODPipelineDefinition): Input {
    switch (definition.options.input.type) {
      case PODPipelineInputType.CSV:
        return new CSVInput(definition.options.input);
      default:
        assertUnreachable(definition.options.input.type);
        throw new Error(
          `Unsupported input type: ${definition.options.input.type}`
        );
    }
  }

  public static createAtoms(
    inputs: Map<string, Input>,
    outputs: PODPipelineOutput[]
  ): PODAtom[] {
    return [];
  }

  public static uniqueIds(definition: PODPipelineDefinition): string[] {
    return [definition.id];
  }
}
