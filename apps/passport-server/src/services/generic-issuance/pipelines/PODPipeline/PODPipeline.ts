import {
  CSVInput,
  Column,
  Input,
  InputRow,
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  PODPipelineInputType,
  PODPipelineOutput,
  PODPipelineOutputMatch,
  PipelineLoadSummary,
  PipelineLog,
  PipelineType,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDAction, PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { PODEntries, serializePODEntries } from "@pcd/pod";
import { PODPCDPackage } from "@pcd/pod-pcd";
import { assertUnreachable, uuidToBigInt } from "@pcd/util";
import { v5 as uuidv5 } from "uuid";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../../database/queries/pipelineAtomDB";
import { IPipelineConsumerDB } from "../../../../database/queries/pipelineConsumerDB";
import { IPipelineSemaphoreHistoryDB } from "../../../../database/queries/pipelineSemaphoreHistoryDB";
import { logger } from "../../../../util/logger";
import { setError, traced } from "../../../telemetryService";
import { SemaphoreGroupProvider } from "../../SemaphoreGroupProvider";
import {
  FeedIssuanceCapability,
  makeGenericIssuanceFeedUrl
} from "../../capabilities/FeedIssuanceCapability";
import { PipelineCapability } from "../../capabilities/types";
import { tracePipeline } from "../../honeycombQueries";
import { CredentialSubservice } from "../../subservices/CredentialSubservice";
import { BasePipelineCapability } from "../../types";
import { makePLogErr, makePLogInfo } from "../logging";
import { BasePipeline } from "../types";
import { finalizeAtom } from "./utils/finalizeAtom";

const LOG_NAME = "PODPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export interface PODAtom extends PipelineAtom {
  matchTo: { entry: string; matchType: PODPipelineOutputMatch["type"] };
  /**
   * @todo if we can look up output configuration via output ID, do we need
   * the matchType above? Alternatively, if we can just add these things to the
   * atom, what about pcdType?
   */
  outputId: string;
  entries: PODEntries;
}

export class PODPipeline implements BasePipeline {
  public type = PipelineType.POD;
  public capabilities: BasePipelineCapability[];

  private eddsaPrivateKey: string;
  private db: IPipelineAtomDB<PODAtom>;
  private definition: PODPipelineDefinition;
  private credentialSubservice: CredentialSubservice;
  private semaphoreGroupProvider?: SemaphoreGroupProvider;
  private consumerDB: IPipelineConsumerDB;

  public get id(): string {
    return this.definition.id;
  }

  public constructor(
    eddsaPrivateKey: string,
    definition: PODPipelineDefinition,
    db: IPipelineAtomDB,
    credentialSubservice: CredentialSubservice,
    consumerDB: IPipelineConsumerDB,
    _semaphoreHistoryDB: IPipelineSemaphoreHistoryDB
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<PODAtom>;
    this.credentialSubservice = credentialSubservice;
    //  this.semaphoreGroupProvider = new SemaphoreGroupProvider(semaphoreHistoryDB);
    this.consumerDB = consumerDB;
    this.capabilities = [
      {
        issue: this.feedIssue.bind(this),
        options: this.definition.options.feedOptions,
        type: PipelineCapability.FeedIssuance,
        feedUrl: makeGenericIssuanceFeedUrl(
          this.id,
          this.definition.options.feedOptions.feedId
        ),
        getZuAuthConfig: async () => []
      } satisfies FeedIssuanceCapability
    ] as unknown as BasePipelineCapability[];
  }

  public async load(): Promise<PipelineLoadSummary> {
    return traced(LOG_NAME, "load", async (span) => {
      tracePipeline(this.definition);
      logger(LOG_TAG, "load", this.definition.id, this.definition.type);

      const start = new Date();
      const logs: PipelineLog[] = [];

      logger(
        LOG_TAG,
        `loading for pipeline id ${this.definition.id} with type ${this.definition.type}`
      );
      logs.push(
        makePLogInfo(`loading data for pipeline '${this.definition.id}'`)
      );

      try {
        const input = PODPipeline.loadInput(this.definition);
        logs.push(
          makePLogInfo(
            `input columns: ${Object.keys(input.getColumns()).join(", ")}`
          )
        );
        logs.push(makePLogInfo(`loaded ${input.getRows().length} rows`));

        const atoms = PODPipeline.createAtoms(
          input,
          this.definition.options.outputs,
          this.definition.id
        );

        await this.db.clear(this.definition.id);
        logs.push(makePLogInfo(`cleared old data`));
        await this.db.save(this.definition.id, atoms);
        logs.push(makePLogInfo(`saved parsed data: ${atoms.length} entries`));
        span?.setAttribute("atom_count", atoms.length);

        const end = new Date();

        logs.push(
          makePLogInfo(`load finished in ${end.getTime() - start.getTime()}ms`)
        );

        return {
          lastRunStartTimestamp: start.toISOString(),
          lastRunEndTimestamp: end.toISOString(),
          latestLogs: logs,
          atomsLoaded: atoms.length,
          atomsExpected: atoms.length,
          success: true
        } satisfies PipelineLoadSummary;
      } catch (e) {
        setError(e, span);
        logs.push(makePLogErr(`failed to load input: ${e}`));
        logs.push(makePLogErr(`input was ${this.definition.options.input}`));

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
    logger(`Starting POD Pipeline ${this.definition.id}`);
  }

  public async stop(): Promise<void> {
    logger(`Stopping POD Pipeline ${this.definition.id}`);
  }

  private async feedIssue(
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return traced(LOG_NAME, "feedIssue", async (span) => {
      if (!req.pcd) {
        throw new Error("missing credential pcd");
      }

      if (this.definition.options.paused) {
        return { actions: [] };
      }

      const credential =
        await this.credentialSubservice.verifyAndExpectZupassEmail(req.pcd);
      const { email, semaphoreId } = credential;

      span?.setAttribute("email", email);
      span?.setAttribute("semaphore_id", semaphoreId);

      // Consumer is validated, so save them in the consumer list
      const didUpdate = await this.consumerDB.save(
        this.id,
        email,
        semaphoreId,
        new Date()
      );

      const atoms = await this.db.load(this.id);
      const atomsToIssue: PODAtom[] = [];

      for (const atom of atoms) {
        if (atom.matchTo.matchType === "email") {
          if (
            atom.entries[atom.matchTo.entry].value.toString().toLowerCase() ===
            email.toLowerCase()
          ) {
            atomsToIssue.push(atom);
          }
        } else if (atom.matchTo.matchType === "semaphoreID") {
          if (
            atom.entries[atom.matchTo.entry].value.toString() ===
            semaphoreId.toString()
          ) {
            atomsToIssue.push(atom);
          }
        }
      }

      const serializedPCDs = await Promise.all(
        atomsToIssue.map(async (atom) => {
          const entries = finalizeAtom(
            atom,
            this.definition.options.outputs[atom.outputId],
            credential
          );

          const pcd = await PODPCDPackage.prove({
            entries: {
              value: entries,
              argumentType: ArgumentTypeName.Object
            },
            privateKey: {
              value: this.eddsaPrivateKey,
              argumentType: ArgumentTypeName.String
            },
            id: {
              value: uuidv5(serializePODEntries(entries), this.id),
              argumentType: ArgumentTypeName.String
            }
          });

          return PODPCDPackage.serialize(pcd);
        })
      );

      const actions: PCDAction[] = [];

      actions.push({
        type: PCDActionType.DeleteFolder,
        folder: this.definition.options.feedOptions.feedFolder,
        recursive: true
      });

      actions.push({
        type: PCDActionType.ReplaceInFolder,
        folder: this.definition.options.feedOptions.feedFolder,
        pcds: serializedPCDs
      });

      return { actions };
    });
  }

  public static loadInput(definition: PODPipelineDefinition): Input {
    switch (definition.options.input.type) {
      case PODPipelineInputType.CSV:
        return new CSVInput(definition.options.input);
      default:
        assertUnreachable(
          definition.options.input.type,
          `Unrecognized input type: ${definition.options.input.type}`
        );
    }
  }

  public static createAtoms(
    input: Input,
    outputs: Record<string, PODPipelineOutput>,
    pipelineId: string
  ): PODAtom[] {
    const atoms: PODAtom[] = [];
    const rows = input.getRows();

    for (const row of rows) {
      for (const [outputId, output] of Object.entries(outputs)) {
        const atom = PODPipeline.atomize(
          input.getColumns(),
          row,
          output,
          outputId,
          pipelineId
        );
        atoms.push(atom);
      }
    }

    return atoms;
  }

  public static atomize(
    columns: Record<string, Column>,
    row: InputRow,
    output: PODPipelineOutput,
    outputId: string,
    pipelineId: string
  ): PODAtom {
    const entries: PODEntries = {};
    for (const [key, entry] of Object.entries(output.entries)) {
      const source = entry.source;

      if (source.type === "input") {
        const column = columns[source.name];
        if (entry.type === "string") {
          // Dates require special conversion to strings as the default
          // string conversion is affected by locale settings.
          if (column.is(PODPipelineInputFieldType.Date)) {
            entries[key] = {
              type: "string",
              value: column.getValue(row).toISOString()
            };
          } else {
            entries[key] = {
              type: "string",
              value: column.getValue(row).toString()
            };
          }
        } else if (entry.type === "cryptographic") {
          if (column.is(PODPipelineInputFieldType.Integer)) {
            entries[key] = {
              type: "cryptographic",
              value: column.getValue(row)
            };
          } else if (column.is(PODPipelineInputFieldType.Date)) {
            entries[key] = {
              type: "cryptographic",
              value: BigInt(column.getValue(row).getTime())
            };
          } else if (column.is(PODPipelineInputFieldType.Boolean)) {
            entries[key] = {
              type: "cryptographic",
              value: BigInt(column.getValue(row))
            };
          } else if (column.is(PODPipelineInputFieldType.UUID)) {
            entries[key] = {
              type: "cryptographic",
              value: uuidToBigInt(column.getValue(row))
            };
          } else {
            throw new Error(
              `Could not map column ${key} from input type ${column.type} to POD type ${entry.type}`
            );
          }
        } else if (entry.type === "int") {
          // These mappings are the same as those for "cryptographic"
          if (column.is(PODPipelineInputFieldType.Integer)) {
            entries[key] = {
              type: "int",
              value: column.getValue(row)
            };
          } else if (column.is(PODPipelineInputFieldType.Date)) {
            entries[key] = {
              type: "int",
              value: BigInt(column.getValue(row).getTime())
            };
          } else if (column.is(PODPipelineInputFieldType.Boolean)) {
            entries[key] = {
              type: "int",
              value: BigInt(column.getValue(row))
            };
          } else if (column.is(PODPipelineInputFieldType.UUID)) {
            entries[key] = {
              type: "int",
              value: uuidToBigInt(column.getValue(row))
            };
          } else {
            throw new Error(
              `Could not map column ${key} from input type ${column.type} to POD value type ${entry.type}`
            );
          }
        } else {
          assertUnreachable(
            entry.type,
            `Unsupported POD value type ${entry.type}`
          );
        }
      } else if (source.type === "configured") {
        entries[key] = {
          // @todo non-string configured values
          type: "string",
          value: source.value
        };
      } else if (
        source.type === "credentialSemaphoreID" ||
        source.type === "credentialEmail"
      ) {
        // These values are not present during loading and so cannot be
        // populated in the Atom.
        continue;
      } else {
        assertUnreachable(source);
      }
    }

    const id = uuidv5(serializePODEntries(entries), pipelineId);
    const matchTo = {
      entry: output.match.inputField,
      matchType: output.match.type
    };

    return { entries, outputId, id, matchTo };
  }

  public static uniqueIds(definition: PODPipelineDefinition): string[] {
    return [definition.id];
  }
}
