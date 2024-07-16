import {
  PODPipelineCSVInput,
  PODPipelineInputFieldType
} from "@pcd/passport-interface";
import { assertUnreachable } from "@pcd/util";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { Input, InputRow, InputValue } from "./Input";

const datelike = z.union([z.number(), z.string(), z.date()]);
const datelikeToDate = datelike.pipe(z.coerce.date());

const safeBigInt = z.union([z.string(), z.number()]).transform((val, ctx) => {
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

  public constructor({ csv, columns }: PODPipelineCSVInput) {
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
            ? // @todo this is way too permissive
              z.coerce.boolean()
            : column.type === PODPipelineInputFieldType.Date
            ? datelikeToDate
            : column.type === PODPipelineInputFieldType.UUID
            ? z.string().uuid()
            : assertUnreachable(column.type)
        ])
      )
    );

    const data: unknown[] = parse(csv, { columns: Object.keys(columns) });
    // @todo check header fields match column names
    data.shift();
    for (const row of data) {
      // This will throw if the row is not valid
      this.data.push(rowSchema.parse(row));
    }
  }

  public async getRows(): Promise<InputRow[]> {
    return this.data;
  }
}
