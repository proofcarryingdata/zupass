import { PODPipelineCSVInput } from "@pcd/passport-interface";
import { parse } from "csv-parse/sync";
import { ZodIssue } from "zod";
import {
  Input,
  InputColumn,
  InputRow,
  InputValue,
  TemplatedColumn
} from "./Input";
import { coercions } from "./coercion";

interface ParseError {
  row: number;
  column: string;
  value: string;
  errors: ZodIssue[];
}

/**
 * Implements the `Input` interface and provides structured access to data from
 * a CSV file/string.
 *
 * Takes in a {@link PODPipelineCSVInput}, which also specifies the columns
 * that are expected to exist, and their data types. Each column has a specific
 * data type, and the cells in that column will be parsed into the appropriate
 * data, if possible. If the data cannot be parsed, an exception will be thrown
 * on construction of the CSVInput. As such, if you have a CSVInput instance
 * then you can be sure that the data in it is strongly typed and valid.
 */
export class CSVInput implements Input {
  private data: Record<string, InputValue>[] = [];
  private columns: Record<string, InputColumn>;

  constructor({ csv, columns }: PODPipelineCSVInput) {
    this.columns = Object.fromEntries(
      Object.entries(columns).map(([name, { type }]) => [
        name,
        new TemplatedColumn(name, type)
      ])
    );

    // Map our pre-configured column types to the appropriate coercion
    // function.
    const coerce = Object.fromEntries(
      Object.entries(columns).map(([key, column]) => [
        key,
        coercions[column.type]
      ])
    );

    const columnNames = Object.keys(columns);
    const data: Record<string, string>[] = parse(csv, { columns: columnNames });
    const header = data.shift();
    // The first row of a CSV file should be the header, which
    // should match the column names in the pipeline configuration
    if (
      !(header instanceof Object) ||
      Object.values(header).length !== columnNames.length ||
      !Object.values(header).every((name) => columnNames.includes(name))
    ) {
      throw new Error("CSV header does not match configured columns");
    }

    let rowIndex = 0;
    const errors: ParseError[] = [];
    for (const row of data) {
      this.data.push(
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => {
            const parsed = coerce[key](value);
            if (parsed.success) {
              return [key, parsed.data];
            }
            errors.push({
              row: rowIndex,
              column: key,
              value,
              errors: parsed.error.errors
            });
            // This data is invalid, but since we're going to throw an
            // exception this will never be made visible to the caller.
            return [key, ""];
          })
        )
      );
      rowIndex++;
    }

    if (errors.length) {
      throw new CSVInputError(errors);
    }
  }

  public getRows(): InputRow[] {
    return this.data;
  }

  public getColumns(): Record<string, InputColumn> {
    return this.columns;
  }

  static fromConfiguration(config: PODPipelineCSVInput): CSVInput {
    return new CSVInput(config);
  }
}

export class CSVInputError extends Error {
  constructor(public errors: ParseError[]) {
    super(`CSVInputError: ${errors.length} error(s) during parsing`);
  }
}
