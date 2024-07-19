import { assertUnreachable } from "@pcd/util";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  PODPipelineCSVInput,
  PODPipelineInputFieldType
} from "../genericIssuanceTypes";
import {
  Input,
  InputColumn,
  InputRow,
  InputValue,
  TemplatedColumn
} from "./Input";

const datelike = z.union([z.number(), z.string(), z.date()]);
const datelikeToDate = datelike.pipe(z.coerce.date());

const booleanLike = z.union([z.boolean(), z.string(), z.number()]);
const booleanValidator = booleanLike.transform((val, ctx) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  const normalized = val.toLowerCase().trim();
  if (["true", "t", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "f", "no", "n", "0", ""].includes(normalized)) return false;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Invalid boolean value"
  });
  return z.NEVER;
});

const safeBigInt = z.string().transform((val, ctx) => {
  try {
    return BigInt(val);
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid BigInt value",
      fatal: true
    });
    return z.NEVER;
  }
});

export class CSVInput implements Input {
  private data: Record<string, InputValue>[] = [];
  private columns: Record<string, InputColumn>;

  public constructor({ csv, columns }: PODPipelineCSVInput) {
    this.columns = Object.fromEntries(
      Object.entries(columns).map(([name, { type }]) => [
        name,
        new TemplatedColumn(name, type)
      ])
    );
    const rowSchema = z.object(
      Object.fromEntries(
        Object.entries(columns).map(([key, column]) => [
          key,
          column.type === PODPipelineInputFieldType.String
            ? z.string()
            : column.type === PODPipelineInputFieldType.Integer
            ? safeBigInt.refine(
                (arg: bigint) => arg >= 0n,
                "Integers must not be negative"
              )
            : column.type === PODPipelineInputFieldType.Boolean
            ? booleanValidator
            : column.type === PODPipelineInputFieldType.Date
            ? datelikeToDate
            : column.type === PODPipelineInputFieldType.UUID
            ? z.string().uuid()
            : assertUnreachable(column.type)
        ])
      )
    );

    const columnNames = Object.keys(columns);
    const data: unknown[] = parse(csv, { columns: columnNames });
    const header = data.shift();
    // The first row of a CSV file should be the header, which
    // should match the column names in the pipeline configuration
    if (
      !(header instanceof Object) ||
      Object.values(header).length !== columnNames.length ||
      !Object.values(header).every((name, index) => name === columnNames[index])
    ) {
      throw new Error("CSV header does not match configured columns");
    }

    for (const row of data) {
      // This will throw if the row is not valid
      this.data.push(rowSchema.parse(row));
    }
  }

  public getRows(): InputRow[] {
    return this.data;
  }

  public getColumns(): Record<string, InputColumn> {
    return this.columns;
  }
}
