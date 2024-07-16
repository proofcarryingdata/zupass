import {
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  PODPipelineInputType,
  PODPipelineOutput,
  PipelineLoadSummary,
  PipelineLog,
  PipelineType
} from "@pcd/passport-interface";
import { PODEntries, serializePODEntries } from "@pcd/pod";
import { assertUnreachable, uuidToBigInt } from "@pcd/util";
import { v5 as uuidv5 } from "uuid";
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
import { Column, Input, InputRow } from "./Input";

const LOG_NAME = "PODPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export interface PODAtom extends PipelineAtom {
  /**
   * @todo matchType should be an enum
   */
  matchTo: { entry: string; matchType: string };
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
      const atoms = PODPipeline.createAtoms(
        input,
        this.definition.options.outputs,
        this.definition.id
      );

      const logs: PipelineLog[] = [];

      const end = new Date();

      return {
        lastRunStartTimestamp: start.toISOString(),
        lastRunEndTimestamp: end.toISOString(),
        latestLogs: logs,
        atomsLoaded: atoms.length,
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
