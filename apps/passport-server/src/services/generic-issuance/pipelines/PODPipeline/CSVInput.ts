import {
  PODPipelineCSVInput,
  PODPipelineInputFieldType
} from "@pcd/passport-interface";
import { assertUnreachable } from "@pcd/util";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { Input, InputRow, InputValue } from "./Input";

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
            ? z.coerce.number().int().positive()
            : column.type === PODPipelineInputFieldType.Boolean
            ? z.coerce.boolean()
            : column.type === PODPipelineInputFieldType.Date
            ? z.coerce.date()
            : column.type === PODPipelineInputFieldType.UUID
            ? z.string().uuid()
            : assertUnreachable(column.type)
        ])
      )
    );

    const data: unknown[] = parse(csv, { columns: Object.keys(columns) });
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
