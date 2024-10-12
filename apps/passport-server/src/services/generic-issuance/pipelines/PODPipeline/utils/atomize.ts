import { PODPipelineOutput } from "@pcd/passport-interface";
import { PODContent, PODEntries, podEntriesToJSON, PODValue } from "@pcd/pod";
import {
  getInputToPODValueConverter,
  InputColumn,
  InputRow
} from "@pcd/podbox-shared";
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
      const converter = getInputToPODValueConverter(column.type, entry.type);
      if (!converter) {
        throw new Error(
          `No converter for input ${source.name} of type ${column.type} to POD value ${key} of type ${entry.type}`
        );
      }
      const cell = column.getValue(row);
      entries[key] = converter(cell);
    } else if (source.type === "configured") {
      if (entry.type === "string") {
        entries[key] = {
          type: "string",
          value: source.value
        } satisfies PODValue;
      } else if (entry.type === "int") {
        entries[key] = {
          type: "int",
          value: BigInt(source.value)
        } satisfies PODValue;
      } else if (entry.type === "cryptographic") {
        entries[key] = {
          type: "cryptographic",
          value: BigInt(source.value)
        } satisfies PODValue;
      }
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

  // PODContent will sort the entry keys. We could duplicate that logic here
  // but using PODContent ensures that we remain up-to-date with any logic that
  // POD uses for sorting and validating entries and their keys.
  const sortedEntries = PODContent.fromEntries(entries).asEntries();

  const id = uuidv5(
    JSON.stringify(podEntriesToJSON(sortedEntries)),
    pipelineId
  );

  return { entries, outputId, id, matchTo: output.match };
}
