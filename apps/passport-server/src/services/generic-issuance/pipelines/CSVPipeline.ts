import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CSVPipelineDefinition,
  PipelineLoadSummary,
  PipelineLog,
  PipelineType,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { RSAImagePCDPackage } from "@pcd/rsa-image-pcd";
import { newRSAPrivateKey } from "@pcd/rsa-pcd";
import { parse } from "csv-parse";
import { v4 as uuid } from "uuid";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../database/queries/pipelineAtomDB";
import { logger } from "../../../util/logger";
import { setError, traced } from "../../telemetryService";
import {
  FeedIssuanceCapability,
  makeGenericIssuanceFeedUrl
} from "../capabilities/FeedIssuanceCapability";
import { PipelineCapability } from "../capabilities/types";
import { tracePipeline } from "../honeycombQueries";
import { BasePipelineCapability } from "../types";
import { makePLogErr, makePLogInfo } from "../util";
import { BasePipeline, Pipeline } from "./types";

const LOG_NAME = "CSVPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export interface CSVAtom extends PipelineAtom {
  row: string[];
}

export class CSVPipeline implements BasePipeline {
  public type = PipelineType.CSV;
  public capabilities: BasePipelineCapability[] = [];

  private eddsaPrivateKey: string;
  private db: IPipelineAtomDB<CSVAtom>;
  private definition: CSVPipelineDefinition;
  private zupassPublicKey: EdDSAPublicKey;
  private rsaKey: string;

  public get id(): string {
    return this.definition.id;
  }

  public get feedCapability(): FeedIssuanceCapability {
    return this.capabilities[0] as FeedIssuanceCapability;
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
    this.rsaKey = newRSAPrivateKey();

    this.capabilities = [
      {
        type: PipelineCapability.FeedIssuance,
        issue: this.issue.bind(this),
        feedUrl: makeGenericIssuanceFeedUrl(
          this.id,
          this.definition.options.feedOptions.feedId
        ),
        options: this.definition.options.feedOptions
      } satisfies FeedIssuanceCapability
    ] as unknown as BasePipelineCapability[];
  }

  private async issue(req: PollFeedRequest): Promise<PollFeedResponseValue> {
    return traced(LOG_NAME, "issue", async (span) => {
      logger(LOG_TAG, `issue`, req);
      tracePipeline(this.definition);

      const atoms = await this.db.load(this.id);
      span?.setAttribute("atoms", atoms.length);

      const defaultTitle = "Cat";
      const defaultImg =
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/A-Cat.jpg/1600px-A-Cat.jpg";

      const serializedPCDs = await Promise.all(
        atoms.map(async (atom: CSVAtom) => {
          const imgTitle = atom.row[0] ?? defaultTitle;
          const imgUrl = atom.row[1] ?? defaultImg;

          const pcd = await RSAImagePCDPackage.prove({
            id: {
              argumentType: ArgumentTypeName.String,
              value: uuid()
            },
            privateKey: {
              argumentType: ArgumentTypeName.String,
              value: this.rsaKey
            },
            title: {
              argumentType: ArgumentTypeName.String,
              value: imgTitle
            },
            url: {
              argumentType: ArgumentTypeName.String,
              value: imgUrl
            }
          });
          const serialized = await RSAImagePCDPackage.serialize(pcd);
          return serialized;
        })
      );

      return {
        actions: [
          {
            type: PCDActionType.DeleteFolder,
            folder: this.definition.options.feedOptions.feedFolder,
            recursive: false
          },
          {
            type: PCDActionType.ReplaceInFolder,
            folder: this.definition.options.feedOptions.feedFolder,
            pcds: serializedPCDs
          }
        ]
      };
    });
  }

  public async load(): Promise<PipelineLoadSummary> {
    return traced(LOG_NAME, "load", async (span) => {
      tracePipeline(this.definition);
      logger(LOG_TAG, "load", this.id, this.definition.type);

      const start = new Date();
      const logs: PipelineLog[] = [];
      logs.push(makePLogInfo(`parsing csv`));

      try {
        const parsedCSV = await parseCSV(this.definition.options.csv);
        const titleRow = parsedCSV.shift();
        logs.push(makePLogInfo(`skipped title row '${titleRow}'`));
        const atoms = parsedCSV.map((row) => {
          return {
            id: uuid(),
            row: row
          };
        });
        await this.db.clear(this.id);
        logs.push(makePLogInfo(`cleared old data`));
        await this.db.save(this.id, atoms);
        logs.push(makePLogInfo(`saved parsed data: ${atoms.length} entries`));
        span?.setAttribute("atom_count", atoms.length);

        return {
          atomsLoaded: atoms.length,
          lastRunEndTimestamp: new Date().toISOString(),
          lastRunStartTimestamp: start.toISOString(),
          latestLogs: logs,
          success: true
        } satisfies PipelineLoadSummary;
      } catch (e) {
        setError(e, span);
        logs.push(makePLogErr(`failed to load csv: ${e}`));
        logs.push(makePLogErr(`csv was ${this.definition.options.csv}`));

        return {
          atomsLoaded: 0,
          lastRunEndTimestamp: new Date().toISOString(),
          lastRunStartTimestamp: start.toISOString(),
          latestLogs: logs,
          success: false
        } satisfies PipelineLoadSummary;
      }
    });
  }

  public async stop(): Promise<void> {
    logger(LOG_TAG, `stopping csv pipeline`);
  }

  public static is(pipeline: Pipeline): pipeline is CSVPipeline {
    return pipeline.type === PipelineType.CSV;
  }
}

export function parseCSV(csv: string): Promise<string[][]> {
  return traced("parseCSV", "parseCSV", async (span) => {
    return new Promise<string[][]>((resolve, reject) => {
      span?.setAttribute("text_length", csv.length);

      const parser = parse();
      const records: string[][] = [];

      parser.on("readable", function () {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record);
        }
      });

      parser.on("error", (err) => {
        setError(err);
        reject(err);
      });

      parser.on("end", () => {
        span?.setAttribute("records", records.length);
        resolve(records);
      });

      parser.write(csv);
      parser.end();
    });
  });
}
