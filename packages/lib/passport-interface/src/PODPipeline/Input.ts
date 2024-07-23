import { PODPipelineInputFieldType } from "../genericIssuanceTypes";

// Map the PODPipelineInputFieldType enum to JavaScript types
// This is used to map between column definitions (which contain the enum) and
// data rows, which contain values of the matching type.
export type FieldTypeToJavaScriptType<T extends PODPipelineInputFieldType> =
  T extends PODPipelineInputFieldType.String
    ? string
    : T extends PODPipelineInputFieldType.Date
    ? Date
    : T extends PODPipelineInputFieldType.UUID
    ? string
    : T extends PODPipelineInputFieldType.Boolean
    ? boolean
    : T extends PODPipelineInputFieldType.Integer
    ? bigint
    : never;

// Specifies a generic column, with a string key and a data type in the
// PODPipelineInputFieldType enum
type ColumnSpec = Record<string, PODPipelineInputFieldType>;

// Represents a single row of data as a key-value pair, where each key can be
// matched to a column key, and where value in the cell for a given key has the
// JavaScript type equivalent to the column's PODPipelineInputFieldType value.
export type TemplatedInputRow<T extends ColumnSpec> = {
  [K in keyof T]: FieldTypeToJavaScriptType<T[K]>;
};

export type InputRow = TemplatedInputRow<ColumnSpec>;
export type InputValue = FieldTypeToJavaScriptType<PODPipelineInputFieldType>;

/**
 * Abstract base interface for all inputs to the pipeline.
 * Currently only implemented by CSVInput.
 */
export interface Input {
  getColumns(): Record<string, InputColumn>;
  getRows(): InputRow[];
}

/**
 * The TemplatedColumn class represents a column whose data is of a given type.
 * The `is` method makes it possible for TypeScript to determine the type of
 * data the column holds, and for the `getValue()` method to be strongly typed.
 *
 * For example, if the column has type PODPipelineInputFieldType.String, then
 * the `getValue()` method will return a JavaScript string.
 */
export class TemplatedColumn<T extends PODPipelineInputFieldType> {
  public readonly type: T;
  private readonly name: string;

  public constructor(name: string, type: T) {
    this.name = name;
    this.type = type;
  }

  public getName(): string {
    return this.name;
  }

  public getValue<
    R extends TemplatedInputRow<Record<string, PODPipelineInputFieldType>>
  >(row: R): FieldTypeToJavaScriptType<T> {
    return row[this.name] as FieldTypeToJavaScriptType<T>;
  }

  public is<T extends PODPipelineInputFieldType>(
    type: T
  ): this is TemplatedColumn<T> {
    return this.type === (type as PODPipelineInputFieldType);
  }
}

export type InputColumn = TemplatedColumn<PODPipelineInputFieldType>;
export type InferColumnValueType<T extends InputColumn> =
  T extends TemplatedColumn<infer U> ? FieldTypeToJavaScriptType<U> : never;
