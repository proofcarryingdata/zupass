import { Options, Input as StringifyInput } from "csv-stringify/.";
import { stringify } from "csv-stringify/sync";
import {
  FeedIssuanceOptions,
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  PODPipelineOutputMatch,
  PODPipelinePODEntry
} from "../genericIssuanceTypes";
import { CSVInput } from "./CSVInput";
import { InputValue } from "./Input";

/**
 * Stringifies the input into a CSV string.
 *
 * This is a thin wrapper around `csv-stringify` with some additional options.
 * It's important to note that CSVInput can't be stringified directly, and
 * instead we need to transform the data slightly before stringifying. The
 * code that does this is contained to this file.
 *
 * @param input - The input to stringify.
 * @param options - The options to use for stringifying.
 * @returns The stringified input.
 */
function stringifyCSV(
  input: StringifyInput,
  options?: Options | undefined
): string {
  return stringify(input, {
    ...options,
    cast: {
      date: (value: Date) => value.toISOString()
    }
  });
}

/**
 * Default values for new cells in columns of specific types
 */
const COLUMN_DEFAULTS = {
  [PODPipelineInputFieldType.String]: "",
  [PODPipelineInputFieldType.Integer]: "0",
  [PODPipelineInputFieldType.Boolean]: "false",
  [PODPipelineInputFieldType.Date]: "1970-01-01",
  [PODPipelineInputFieldType.UUID]: "00000000-0000-0000-0000-000000000000"
};

/**
 * Renames an input column in a PODPipelineDefinition. If the input column was
 * used as a source for an output column, the source will be updated
 * accordingly.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param oldName The name of the column to rename.
 * @param newName The new name for the column.
 * @returns The updated PODPipelineDefinition.
 */
export function renameInputColumn(
  definition: PODPipelineDefinition,
  oldName: string,
  newName: string
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);

  // Rename the column
  newDefinition.options.input = {
    ...newDefinition.options.input,
    columns: {
      ...newDefinition.options.input.columns,
      [newName]: newDefinition.options.input.columns[oldName]
    }
  };
  delete newDefinition.options.input.columns[oldName];

  // Update the CSV to reflect the renaming
  const csvInput = CSVInput.fromConfiguration(definition.options.input);
  const newCsv = stringifyCSV([
    Object.keys(csvInput.getColumns()).map((key) =>
      key === oldName ? newName : key
    ),
    ...csvInput.toPlainRows()
  ]);
  newDefinition.options.input.csv = newCsv;

  // Update the outputs to reflect the renaming
  newDefinition.options.outputs = Object.fromEntries(
    Object.entries(definition.options.outputs).map(([key, value]) => [
      key,
      {
        ...value,
        entries: Object.fromEntries(
          Object.entries(value.entries).map(([k, v]) => {
            if (v.source.type === "input" && v.source.name === oldName) {
              return [k, { ...v, source: { ...v.source, name: newName } }];
            }
            return [k, v];
          })
        )
      }
    ])
  );

  return newDefinition;
}

/**
 * Adds an input column to a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param name The name of the column to add.
 * @param type The type of the column to add.
 * @returns The updated PODPipelineDefinition.
 */
export function addInputColumn(
  definition: PODPipelineDefinition,
  name: string,
  type: PODPipelineInputFieldType
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  newDefinition.options.input = {
    ...newDefinition.options.input,
    columns: { ...newDefinition.options.input.columns, [name]: { type } }
  };

  const csvInput = CSVInput.fromConfiguration(definition.options.input);
  const defaultValue = COLUMN_DEFAULTS[type];
  newDefinition.options.input.csv = stringifyCSV([
    [...Object.keys(csvInput.getColumns()), name],
    ...csvInput.toPlainRows().map((row) => [...row, defaultValue])
  ]);

  return newDefinition;
}

/**
 * Deletes an input column from a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param name The name of the column to delete.
 * @returns The updated PODPipelineDefinition.
 */
export function deleteInputColumn(
  definition: PODPipelineDefinition,
  name: string
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  delete newDefinition.options.input.columns[name];

  const csvInput = CSVInput.fromConfiguration(definition.options.input);
  const keys = Object.keys(csvInput.getColumns());
  const index = keys.indexOf(name);
  const newCsv = stringifyCSV([
    keys.filter((key) => key !== name),
    ...csvInput.toPlainRows().map((row) => {
      row.splice(index, 1);
      return row;
    })
  ]);
  newDefinition.options.input.csv = newCsv;

  // Update the outputs to remove any output depending on the deleted column
  newDefinition.options.outputs = Object.fromEntries(
    Object.entries(definition.options.outputs).map(([key, value]) => [
      key,
      {
        ...value,
        entries: Object.fromEntries(
          Object.entries(value.entries).filter(([_k, v]) => {
            if (v.source.type === "input" && v.source.name === name) {
              return false;
            }
            return true;
          })
        )
      }
    ])
  );

  return newDefinition;
}

/**
 * Updates a cell in the input CSV of a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param rowNumber The row number of the cell to update.
 * @param column The column name of the cell to update.
 * @param value The new value for the cell.
 * @returns The updated PODPipelineDefinition.
 */
export function updateInputCell(
  definition: PODPipelineDefinition,
  rowNumber: number,
  column: string,
  value: InputValue
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  const csvInput = CSVInput.fromConfiguration(definition.options.input);
  const columnIndex = Object.keys(csvInput.getColumns()).indexOf(column);
  console.log(columnIndex);
  console.log([
    Object.keys(csvInput.getColumns()),
    ...csvInput.toPlainRows().map((row, index) => {
      if (index === rowNumber) {
        return row.map((cell, i) => (i === columnIndex ? value : cell));
      }
      return row;
    })
  ]);
  const newCsv = stringifyCSV([
    Object.keys(csvInput.getColumns()),
    ...csvInput.toPlainRows().map((row, index) => {
      if (index === rowNumber) {
        return row.map((cell, i) => (i === columnIndex ? value : cell));
      }
      return row;
    })
  ]);
  newDefinition.options.input.csv = newCsv;
  return newDefinition;
}

/**
 * Adds a row to the input CSV of a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @returns The updated PODPipelineDefinition.
 */
export function addInputRow(
  definition: PODPipelineDefinition
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  const csvInput = CSVInput.fromConfiguration(definition.options.input);
  const newCsv = stringifyCSV([
    Object.keys(csvInput.getColumns()),
    ...csvInput.toPlainRows(),
    Object.values(csvInput.getColumns()).map((col) => COLUMN_DEFAULTS[col.type])
  ]);
  newDefinition.options.input.csv = newCsv;
  return newDefinition;
}

export function updateInputCSV(
  definition: PODPipelineDefinition,
  data: InputValue[][]
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  const newCsv = stringifyCSV([
    Object.keys(definition.options.input.columns),
    ...data.map((row) => {
      return Object.values(definition.options.input.columns).map(
        ({ type }, index) => {
          if (index < row.length) {
            return row[index] ?? COLUMN_DEFAULTS[type];
          }
          return COLUMN_DEFAULTS[type];
        }
      );
    })
  ]);
  newDefinition.options.input.csv = newCsv;
  return newDefinition;
}

/**
 * Adds an entry to an output of a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param outputName The name of the output to add an entry to.
 * @returns The updated PODPipelineDefinition.
 */
export function addOutputEntry(
  definition: PODPipelineDefinition,
  outputName: string
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  let key = "new_entry";
  let retries = 0;
  while (key in (newDefinition.options.outputs[outputName].entries ?? {})) {
    retries++;
    key = `new_entry_${retries}`;
  }

  newDefinition.options.outputs[outputName].entries = {
    ...newDefinition.options.outputs[outputName].entries,
    [key]: {
      type: "string",
      source: {
        type: "input",
        name: Object.keys(definition.options.input.columns)[0]
      }
    }
  };
  return newDefinition;
}

/**
 * Deletes an entry from an output of a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param outputName The name of the output to delete an entry from.
 * @param key The key of the entry to delete.
 * @returns The updated PODPipelineDefinition.
 */
export function deleteOutputEntry(
  definition: PODPipelineDefinition,
  outputName: string,
  key: string
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);

  const { [key]: _, ...rest } =
    newDefinition.options.outputs[outputName].entries;
  newDefinition.options.outputs[outputName].entries = rest;

  return newDefinition;
}

/**
 * Changes the type of an entry in an output of a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param outputName The name of the output to change the entry type in.
 * @param key The key of the entry to change the type of.
 * @param type The new type for the entry.
 * @returns The updated PODPipelineDefinition.
 */
export function changeOutputEntryType(
  definition: PODPipelineDefinition,
  outputName: string,
  key: string,
  type: PODPipelinePODEntry["type"]
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  newDefinition.options.outputs[outputName].entries[key].type = type;
  return newDefinition;
}

/**
 * Changes the name of an entry in an output of a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param outputName The name of the output to change the entry name in.
 * @param key The key of the entry to change the name of.
 * @param newName The new name for the entry.
 * @returns The updated PODPipelineDefinition.
 */
export function changeOutputEntryName(
  definition: PODPipelineDefinition,
  outputName: string,
  key: string,
  newName: string
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  newDefinition.options.outputs[outputName].entries = Object.fromEntries(
    Object.entries(newDefinition.options.outputs[outputName].entries).map(
      ([k, v]) => [k === key ? newName : k, v]
    )
  );
  return newDefinition;
}

/**
 * Changes the match of an output of a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param outputName The name of the output to change the match of.
 * @param match The new match filter for the output.
 * @returns The updated PODPipelineDefinition.
 */
export function changeOutputMatch(
  definition: PODPipelineDefinition,
  outputName: string,
  match: PODPipelineOutputMatch
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  newDefinition.options.outputs[outputName].match = match;
  return newDefinition;
}

/**
 * Changes an entry in an output of a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param outputName The name of the output to change the entry in.
 * @param key The key of the entry to change.
 * @param entry The new entry to change.
 * @returns The updated PODPipelineDefinition.
 */
export function changeOutputEntry(
  definition: PODPipelineDefinition,
  outputName: string,
  key: string,
  entry: PODPipelinePODEntry
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  newDefinition.options.outputs[outputName].entries[key] = entry;
  return newDefinition;
}

/**
 * Sets the feed options for a PODPipelineDefinition.
 *
 * @param definition The PODPipelineDefinition to update.
 * @param feedOptions The new feed options for the pipeline.
 * @returns The updated PODPipelineDefinition.
 */
export function setFeedOptions(
  definition: PODPipelineDefinition,
  feedOptions: FeedIssuanceOptions
): PODPipelineDefinition {
  const newDefinition = structuredClone(definition);
  newDefinition.options.feedOptions = feedOptions;
  return newDefinition;
}
