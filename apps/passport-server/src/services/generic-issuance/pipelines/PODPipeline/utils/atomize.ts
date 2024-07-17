import {
  InputColumn,
  InputRow,
  PODPipelineInputFieldType,
  PODPipelineOutput
} from "@pcd/passport-interface";
import { PODEntries, serializePODEntries } from "@pcd/pod";
import { assertUnreachable, uuidToBigInt } from "@pcd/util";
import { v5 as uuidv5 } from "uuid";
import { PODAtom } from "../PODPipeline";

/**
 * Creates a {@link PODAtom} from the output configuration, input columns, and
 * input row. Maps input columns to POD values and handles conversions between
 * input types and POD types.
 *
 * @param columns The input columns, which contain data type information
 * @param row The input row, which contains the actual values
 * @param output The output configuration, which contains the output entries and the match information
 * @param outputId The ID of the output
 * @param pipelineId The ID of the pipeline
 * @returns The PODAtom
 */
export function atomize(
  columns: Record<string, InputColumn>,
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
