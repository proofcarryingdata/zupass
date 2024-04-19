import {
  CSVPipelineDefinition,
  CSVPipelineOutputType,
  PipelineLoadSummary,
  PipelineLog,
  PipelineType,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { SerializedPCD } from "@pcd/pcd-types";
import { parse } from "csv-parse";
import { v4 as uuid } from "uuid";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../../database/queries/pipelineAtomDB";
import { logger } from "../../../../util/logger";
import { setError, traced } from "../../../telemetryService";
import {
  FeedIssuanceCapability,
  makeGenericIssuanceFeedUrl
} from "../../capabilities/FeedIssuanceCapability";
import { PipelineCapability } from "../../capabilities/types";
import { tracePipeline } from "../../honeycombQueries";
import { CredentialSubservice } from "../../subservices/CredentialSubservice";
import { BasePipelineCapability } from "../../types";
import { makePLogErr, makePLogInfo } from "../logging";
import { BasePipeline, Pipeline } from "../types";
import { makeMessagePCD } from "./makeMessagePCD";
import { makeTicketPCD, summarizeEventAndProductIds } from "./makeTicketPCD";

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
  private credentialSubservice: CredentialSubservice;

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
    credentialSubservice: CredentialSubservice
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<CSVAtom>;
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
    this.credentialSubservice = credentialSubservice;
  }

  private async issue(req: PollFeedRequest): Promise<PollFeedResponseValue> {
    return traced(LOG_NAME, "issue", async (span) => {
      logger(LOG_TAG, `issue`, req);
      tracePipeline(this.definition);

      const atoms = await this.db.load(this.id);
      span?.setAttribute("atoms", atoms.length);

      const outputType =
        this.definition.options.outputType ?? CSVPipelineOutputType.Message;

      let requesterEmail: string | undefined;
      let requesterSemaphoreId: string | undefined;

      if (req.pcd) {
        try {
          const { emailClaim } =
            await this.credentialSubservice.verifyAndExpectZupassEmail(req.pcd);
          requesterEmail = emailClaim.emailAddress;
          requesterSemaphoreId = emailClaim.semaphoreId;
        } catch (e) {
          logger(LOG_TAG, "credential PCD not verified for req", req);
        }
      }

      // TODO: cache these
      const somePCDs = await Promise.all(
        atoms.map(async (atom: CSVAtom) =>
          makeCSVPCD(
            atom.row,
            this.definition.options.outputType ?? CSVPipelineOutputType.Message,
            {
              requesterEmail,
              requesterSemaphoreId,
              eddsaPrivateKey: this.eddsaPrivateKey,
              pipelineId: this.id
            }
          )
        )
      );

      const pcds = somePCDs.filter((p) => !!p) as SerializedPCD[];

      logger(
        LOG_TAG,
        `pipeline ${this.id} of type ${outputType} issuing`,
        pcds.length,
        "PCDs"
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
            pcds
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

        const end = new Date();
        logs.push(
          makePLogInfo(`load finished in ${end.getTime() - start.getTime()}ms`)
        );

        if (
          this.definition.options.outputType === CSVPipelineOutputType.Ticket
        ) {
          logs.push(
            makePLogInfo(
              `\n\nevent and product ids summary:\n${summarizeEventAndProductIds(
                this.id,
                atoms.map((a) => a.row)
              )}`
            )
          );
        }

        return {
          atomsLoaded: atoms.length,
          atomsExpected: parsedCSV.length,
          lastRunEndTimestamp: end.toISOString(),
          lastRunStartTimestamp: start.toISOString(),
          latestLogs: logs,
          success: true
        } satisfies PipelineLoadSummary;
      } catch (e) {
        setError(e, span);
        logs.push(makePLogErr(`failed to load csv: ${e}`));
        logs.push(makePLogErr(`csv was ${this.definition.options.csv}`));

        const end = new Date();
        logs.push(
          makePLogInfo(`load finished in ${end.getTime() - start.getTime()}ms`)
        );

        return {
          atomsLoaded: 0,
          atomsExpected: 0,
          lastRunEndTimestamp: end.toISOString(),
          lastRunStartTimestamp: start.toISOString(),
          latestLogs: logs,
          success: false
        } satisfies PipelineLoadSummary;
      }
    });
  }

  public async start(): Promise<void> {
    logger(LOG_TAG, `starting csv pipeline`);
  }

  public async stop(): Promise<void> {
    logger(LOG_TAG, `stopping csv pipeline`);
  }

  public static is(pipeline: Pipeline): pipeline is CSVPipeline {
    return pipeline.type === PipelineType.CSV;
  }

  /**
   * Returns all of the unique IDs associated with a CSV pipeline
   * definition.
   */
  public static uniqueIds(definition: CSVPipelineDefinition): string[] {
    const ids = [definition.id];
    return ids;
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

export async function makeCSVPCD(
  inputRow: string[],
  type: CSVPipelineOutputType,
  opts: {
    requesterEmail?: string;
    requesterSemaphoreId?: string;
    eddsaPrivateKey: string;
    pipelineId: string;
  }
): Promise<SerializedPCD | undefined> {
  return traced("makeCSVPCD", "makeCSVPCD", async (span) => {
    span?.setAttribute("output_type", type);

    switch (type) {
      case CSVPipelineOutputType.Message:
        return makeMessagePCD(inputRow, opts.eddsaPrivateKey);
      case CSVPipelineOutputType.Ticket:
        return makeTicketPCD(
          inputRow,
          opts.eddsaPrivateKey,
          opts.requesterEmail,
          opts.requesterSemaphoreId,
          opts.pipelineId
        );
      default:
        // will not compile in case we add a new output type
        // if you've added another type, plz add an impl here XD
        return null as never;
    }
  });
}
