import { PodspecError } from "./error";
import { ParseParams, ParseResult, isValid } from "./parse";

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

  abstract _parse(data: unknown, params?: ParseParams): ParseResult<Output>;

  abstract serialize(): Serialized;

  public constructor(public def: Def) {}

  public parse(data: unknown, params?: ParseParams): Output {
    const result = this.safeParse(data, params);
    if (isValid(result)) {
      return result.value;
    }
    throw new PodspecError(result.issues);
  }

  public safeParse(data: unknown, params?: ParseParams): ParseResult<Output> {
    return this._parse(data, params);
  }
}
