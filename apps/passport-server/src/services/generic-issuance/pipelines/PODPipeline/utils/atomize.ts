import {
  InputColumn,
  InputRow,
  PODPipelineOutput,
  getInputToPODValueConverter
} from "@pcd/passport-interface";
import { PODEntries, serializePODEntries } from "@pcd/pod";
import { assertUnreachable } from "@pcd/util";
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
      /**
       * See {@link getInputToPODValueConverter} for detail on how this
       * conversion is done.
       */
      const converter = getInputToPODValueConverter(column, entry.type);
      if (!converter) {
        throw new Error(
          `No converter for input ${source.name} of type ${column.type} to POD value ${key} of type ${entry.type}`
        );
      }
      const cell = column.getValue(row);
      if (!cell.valid) {
        throw new Error(
          `Invalid input value for column ${source.name} of type ${column.type}`
        );
      }
      entries[key] = converter(cell.value);
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

  return { entries, outputId, id, matchTo: output.match };
}
