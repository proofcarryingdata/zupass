import { PodspecError } from "./error";
import { ParseParams, ParseResult, isValid } from "./parse";

/**
 * The types of Podspec values that can be present in an "entries" Podspec.
 */
export enum PodspecDataType {
  String = "string",
  Int = "int",
  Cryptographic = "cryptographic",
  EdDSAPubKey = "eddsa_pubkey",
  Optional = "optional"
}

/**
 * Base interface for all Podspec definitions.
 */
export interface PodspecDataTypeDef {
  type: PodspecDataType;
}

/**
 * Base class for all Podspec values.
 */
export abstract class PodspecValue<
  // The type of the definition of the Podspec value.
  Def extends PodspecDataTypeDef = PodspecDataTypeDef,
  // The type of the output of the Podspec value.
  Output = unknown,
  // The type of the input of the Podspec value.
  Input = Output,
  // The type of the serialized form of the Podspec value.
  Serialized = Def
> {
  // Fake values which TypeScript uses to infer the types of the Podspec value.
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
