import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CSVPipelineDefinition,
  PipelineLog,
  PipelineRunInfo,
  PipelineType
} from "@pcd/passport-interface";
import { parse } from "csv-parse";
import { v4 as uuid } from "uuid";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { logger } from "../../../util/logger";
import { BasePipelineCapability } from "../types";
import { makePLogErr, makePLogInfo } from "../util";
import { BasePipeline, Pipeline } from "./types";

const LOG_NAME = "CSVPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export interface CSVAtom extends PipelineAtom {
  row: object;
}

export class CSVPipeline implements BasePipeline {
  public type = PipelineType.CSV;
  public capabilities: BasePipelineCapability[] = [];

  private eddsaPrivateKey: string;
  private db: IPipelineAtomDB<CSVAtom>;
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
    this.db = db as IPipelineAtomDB<CSVAtom>;
    this.zupassPublicKey = zupassPublicKey;
  }

  public async load(): Promise<PipelineRunInfo> {
    const start = new Date();
    const logs: PipelineLog[] = [];

    try {
      const parsedCSV = await parseCSV(this.definition.options.csv);
      const atoms = parsedCSV.map((row) => {
        return {
          id: uuid(),
          row: row
        };
      });

      await this.db.save(this.id, atoms);
      logs.push(makePLogInfo(`loaded csv ${this.definition.options.csv}`));

      return {
        atomsLoaded: atoms.length,
        lastRunEndTimestamp: Date.now(),
        lastRunStartTimestamp: start.getTime(),
        latestLogs: logs,
        success: true
      };
    } catch (e) {
      logs.push(makePLogErr(`failed to load csv: ${e}`));

      return {
        atomsLoaded: 0,
        lastRunEndTimestamp: Date.now(),
        lastRunStartTimestamp: start.getTime(),
        latestLogs: logs,
        success: true
      };
    }
  }

  public async stop(): Promise<void> {
    logger(LOG_TAG, `stopping csv pipeline`);
  }

  public static is(pipeline: Pipeline): pipeline is CSVPipeline {
    return pipeline.type === PipelineType.CSV;
  }
}

export function parseCSV(csv: string): Promise<object[]> {
  return new Promise<object[]>((resolve, reject) => {
    const parser = parse({});
    const records: object[] = [];

    parser.on("readable", function () {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on("error", (err) => {
      reject(err);
    });

    parser.on("end", () => {
      resolve(records);
    });

    parser.write(csv);
    parser.end();
  });
}
