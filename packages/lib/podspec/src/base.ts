import { ParseResult, isValid } from "./parse";

export enum PodspecDataType {
  String = "string",
  Int = "int",
  Cryptographic = "cryptographic",
  EdDSAPubKey = "eddsa_pubkey",
  Optional = "optional"
}

export interface PodspecDataTypeDef {
  type: PodspecDataType;
}

export abstract class PodspecValue<
  Def extends PodspecDataTypeDef = PodspecDataTypeDef,
  Output = unknown,
  Input = Output,
  Serialized = Def
> {
  readonly _output!: Output;
  readonly _input!: Input;
  readonly errors: Error[] = [];

  abstract _parse(data: unknown): ParseResult<Output>;

  abstract serialize(): Serialized;

  public constructor(public def: Def) {}

  public parse(data: unknown): Output {
    const result = this._parse(data);
    if (isValid(result)) {
      return result.value;
    }
    throw new Error("Parse failed");
  }

  public safeParse(data: unknown): ParseResult<Output> {
    return this._parse(data);
  }

  _addError(e: Error): void {
    this.errors.push(e);
  }
}
