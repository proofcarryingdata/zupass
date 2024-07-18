import { PODPipelineInputFieldType } from "../genericIssuanceTypes";

type FieldTypeToValue<T extends PODPipelineInputFieldType> =
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

export type TemplatedInputRow<
  T extends Record<string, PODPipelineInputFieldType>
> = {
  [K in keyof T]: FieldTypeToValue<T[K]>;
};

export type InputRow = TemplatedInputRow<
  Record<string, PODPipelineInputFieldType>
>;

export type InputValue = string | bigint | boolean | Date;

interface TemplatedInput<T extends Record<string, PODPipelineInputFieldType>> {
  getColumns(): Record<string, InputColumn>;
  getRows(): TemplatedInputRow<T>[];
}

export type Input = TemplatedInput<Record<string, PODPipelineInputFieldType>>;

export class TemplatedColumn<T extends PODPipelineInputFieldType> {
  public readonly type: T;
  private readonly name: string;

  public constructor(name: string, type: T) {
    this.name = name;
    this.type = type;
  }

  public getValue<
    R extends TemplatedInputRow<Record<string, PODPipelineInputFieldType>>
  >(row: R): FieldTypeToValue<T> {
    return row[this.name] as FieldTypeToValue<T>;
  }

  public is<T extends PODPipelineInputFieldType>(
    type: T
  ): this is TemplatedColumn<T> {
    return this.type === (type as PODPipelineInputFieldType);
  }
}

export type InputColumn = TemplatedColumn<PODPipelineInputFieldType>;
