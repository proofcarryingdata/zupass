import {
  checkBigintBounds,
  checkPODName,
  checkPublicKeyFormat,
  POD,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  PODCryptographicValue,
  PODEdDSAPublicKeyValue,
  PODEntries,
  PODIntValue,
  PODStringValue,
  PODValue
} from "@pcd/pod";

/**
 * TODOs:
 * - [ ] Wrap checkBigIntBounds to stop exceptions being thrown.
 * - [ ] (De)Serialization of PodspecType and subclasses
 * - [ ] Async validation
 * - [ ] Add a special check for signer public keys
 * - [ ] Better error reporting
 * - [ ] Optional entries
 */

function assertUnreachable(_: never, message?: string): never {
  throw new Error(message ?? "Unreachable");
}

enum PodspecDataType {
  String = "string",
  Int = "int",
  Cryptographic = "cryptographic",
  EdDSAPubKey = "eddsa_pubkey"
}

function isEqualPODValue(a: PODValue, b: PODValue): boolean {
  return a.type === b.type && a.value === b.value;
}

/**
 * Checks if the given data has the correct shape for a POD integer value.
 * Does not check the bounds of the integer.
 *
 * @param data - The data to check
 * @returns True if the data has the correct shape for a POD integer value
 */
function isPODIntValue(data: unknown): data is PODIntValue {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data is null or not an object");
  }
  if (!("type" in data && "value" in data)) {
    throw new Error("Data does not have type and value properties");
  }
  if (data.type !== "int") {
    throw new Error("PODValue type is not int");
  }
  if (typeof data.value !== "bigint") {
    throw new Error("Data value is not a bigint");
  }
  return true;
}

/**
 * Checks if the given data has the correct shape for a POD string value.
 *
 * @param data - The data to check
 * @returns True if the data has the correct shape for a POD string value
 */
function isPODStringValue(data: unknown): data is PODStringValue {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data is null or not an object");
  }
  if (!("type" in data && "value" in data)) {
    throw new Error("Data does not have type and value properties");
  }
  if (data.type !== "string") {
    throw new Error("PODValue type is not string");
  }
  if (typeof data.value !== "string") {
    throw new Error("Data value is not a string");
  }
  return true;
}

function isPODCryptographicValue(data: unknown): data is PODCryptographicValue {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data is null or not an object");
  }
  if (!("type" in data && "value" in data)) {
    throw new Error("Data does not have type and value properties");
  }
  if (data.type !== "cryptographic") {
    throw new Error("PODValue type is not cryptographic");
  }
  if (typeof data.value !== "bigint") {
    throw new Error("Data value is not a bigint");
  }
  return true;
}

function isPODEdDSAPublicKeyValue(
  data: unknown
): data is PODEdDSAPublicKeyValue {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data is null or not an object");
  }
  if (!("type" in data && "value" in data)) {
    throw new Error("Data does not have type and value properties");
  }
  if (data.type !== "eddsa_pubkey") {
    throw new Error("PODValue type is not eddsa_pubkey");
  }
  if (typeof data.value !== "string") {
    throw new Error("Data value is not a string");
  }
  return true;
}

interface PodspecStringDef extends PodspecTypeDef {
  type: PodspecDataType.String;
  checks: StringCheck[];
  coerce: boolean;
}

interface PodspecIntegerDef extends PodspecTypeDef {
  type: PodspecDataType.Int;
  checks: IntegerCheck[];
  coerce: boolean;
}

interface PodspecCryptographicDef extends PodspecTypeDef {
  type: PodspecDataType.Cryptographic;
  coerce: boolean;
}

interface PodspecEdDSAPubKeyDef extends PodspecTypeDef {
  type: PodspecDataType.EdDSAPubKey;
  coerce: boolean;
}

type StringCheck = {
  kind: "list";
  list: string[];
  exclude?: boolean;
};

type IntegerCheck =
  | {
      kind: "range";
      min: bigint;
      max: bigint;
    }
  | {
      kind: "list";
      list: bigint[];
      exclude?: boolean;
    };

interface CreateArgs<C> {
  coerce?: boolean;
  checks?: C[];
}

interface PodspecTypeDef {
  description?: string;
}

abstract class PodspecType<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Output = any,
  Def extends PodspecTypeDef = PodspecTypeDef,
  Input = Output
> {
  readonly _output!: Output;
  readonly _input!: Input;
  private errors: Error[] = [];

  public constructor(public readonly def: Def) {}

  abstract _parse(data: unknown): ParseResult<Output>;
  abstract serialize(): Def;

  public safeParse(data: unknown): ParseResult<Output> {
    return this._parse(data);
  }

  public parse(data: unknown): Output {
    const result = this._parse(data);
    if (isValid(result)) {
      return result.value;
    }
    throw new Error("Parse failed");
  }

  _addError(e: Error): void {
    this.errors.push(e);
  }
}

class PodspecEdDSAPubKey extends PodspecType<
  PODEdDSAPublicKeyValue,
  PodspecEdDSAPubKeyDef,
  PODEdDSAPublicKeyValue | string
> {
  private dataToValue(data: unknown): PODEdDSAPublicKeyValue {
    try {
      if (isPODEdDSAPublicKeyValue(data)) {
        return data;
      }
    } catch (e) {
      if (this.def.coerce) {
        if (typeof data === "string") {
          return { type: "eddsa_pubkey", value: data };
        }
      } else {
        throw e;
      }
    }
    throw new Error("Data is not a valid POD eddsa_pubkey value");
  }

  _parse(data: unknown): ParseResult<PODEdDSAPublicKeyValue> {
    try {
      const value = this.dataToValue(data);
      checkPublicKeyFormat(value.value);
      return SUCCESS(value);
    } catch (e) {
      this._addError(e as Error);
      return FAILURE;
    }
  }

  static create(args?: CreateArgs<never>): PodspecEdDSAPubKey {
    return new PodspecEdDSAPubKey({
      type: PodspecDataType.EdDSAPubKey,
      coerce: args?.coerce ?? false
    });
  }

  public serialize(): PodspecEdDSAPubKeyDef {
    return {
      type: PodspecDataType.EdDSAPubKey,
      coerce: this.def.coerce
    };
  }
}

class PodspecCryptographic extends PodspecType<
  PODCryptographicValue,
  PodspecCryptographicDef,
  PODIntValue | number | bigint
> {
  private dataToValue(data: unknown): PODCryptographicValue {
    try {
      if (isPODCryptographicValue(data)) {
        return data;
      }
    } catch (e) {
      // If coercion is allowed, we can try to convert some types to PODCryptographicValue
      if (this.def.coerce) {
        if (typeof data === "number") {
          return { type: "cryptographic", value: BigInt(data) };
        }
        if (typeof data === "bigint") {
          return { type: "cryptographic", value: data };
        }
      } else {
        throw e;
      }
    }
    throw new Error("Data is not a valid POD cryptographic value");
  }

  _parse(data: unknown): ParseResult<PODCryptographicValue> {
    try {
      const value = this.dataToValue(data);
      checkBigintBounds(
        "",
        value.value,
        POD_CRYPTOGRAPHIC_MIN,
        POD_CRYPTOGRAPHIC_MAX
      );
      return SUCCESS(value);
    } catch (e) {
      this._addError(e as Error);
      return FAILURE;
    }
  }

  static create(args?: CreateArgs<never>): PodspecCryptographic {
    return new PodspecCryptographic({
      type: PodspecDataType.Cryptographic,
      coerce: args?.coerce ?? false
    });
  }

  public serialize(): PodspecCryptographicDef {
    return {
      type: PodspecDataType.Cryptographic,
      coerce: this.def.coerce
    };
  }
}

class PodspecInteger extends PodspecType<
  PODIntValue,
  PodspecIntegerDef,
  PODIntValue | number | bigint
> {
  private checks: IntegerCheck[] = [];

  private dataToValue(data: unknown): PODIntValue {
    try {
      if (isPODIntValue(data)) {
        return data;
      }
    } catch (e) {
      // If coercion is allowed, we can try to convert some types to PODIntValue
      if (this.def.coerce) {
        if (typeof data === "bigint") {
          checkBigintBounds("", data, POD_INT_MIN, POD_INT_MAX);
          return { type: "int", value: data };
        }
        if (typeof data === "number") {
          const bigIntValue = BigInt(data);
          checkBigintBounds("", bigIntValue, POD_INT_MIN, POD_INT_MAX);
          return { type: "int", value: bigIntValue };
        }
      } else {
        throw e;
      }
    }
    throw new Error("Data is not a valid POD integer value");
  }

  _parse(data: unknown): ParseResult<PODIntValue> {
    try {
      const value = this.dataToValue(data);

      for (const check of this.checks) {
        if (check.kind === "range") {
          if (value.value < check.min || value.value > check.max) {
            throw new Error("Value out of range");
          }
        } else if (check.kind === "list") {
          const included = check.list.includes(value.value);
          if (!included && !check.exclude) {
            throw new Error("Value not in allowed list");
          }
          if (included && check.exclude) {
            throw new Error("Value in excluded list");
          }
        } else {
          assertUnreachable(check);
        }
      }

      return SUCCESS(value);
    } catch (e) {
      this._addError(e as Error);
      return FAILURE;
    }
  }

  public list(list: bigint[], exclude = false): typeof this {
    this.checks.push({
      kind: "list",
      list,
      exclude
    });
    return this;
  }

  public inRange(min: bigint, max: bigint): typeof this {
    if (min < POD_INT_MIN) {
      throw new Error("Minimum value out of bounds");
    }
    if (max > POD_INT_MAX) {
      throw new Error("Maximum value out of bounds");
    }
    if (min > max) {
      throw new Error("Minimum value is greater than maximum value");
    }
    this.checks.push({
      kind: "range",
      min,
      max
    });
    return this;
  }

  static create(args?: CreateArgs<IntegerCheck>): PodspecInteger {
    return new PodspecInteger({
      type: PodspecDataType.Int,
      checks: args?.checks ?? [],
      coerce: args?.coerce ?? false
    });
  }

  public serialize(): PodspecIntegerDef {
    return {
      type: PodspecDataType.Int,
      checks: structuredClone(this.checks),
      coerce: this.def.coerce
    };
  }
}

class PodspecString extends PodspecType<
  PODStringValue,
  PodspecStringDef,
  PODStringValue | string
> {
  private checks: StringCheck[] = [];

  public list(list: string[], exclude = false): PodspecString {
    this.checks.push({
      kind: "list",
      list,
      exclude
    });
    return this;
  }

  static create(args?: CreateArgs<StringCheck>): PodspecString {
    return new PodspecString({
      type: PodspecDataType.String,
      checks: args?.checks ?? [],
      coerce: args?.coerce ?? false
    });
  }

  public serialize(): PodspecStringDef {
    return {
      type: PodspecDataType.String,
      checks: structuredClone(this.checks),
      coerce: this.def.coerce
    };
  }

  private dataToValue(data: unknown): PODStringValue {
    try {
      if (isPODStringValue(data)) {
        return data;
      }
    } catch (e) {
      if (this.def.coerce) {
        if (typeof data === "string") {
          return { type: "string", value: data };
        }
      } else {
        throw e;
      }
    }
    throw new Error("Data is not a valid POD string value");
  }

  _parse(data: unknown): ParseResult<PODStringValue> {
    try {
      const value = this.dataToValue(data);
      for (const check of this.checks) {
        if (check.kind === "list") {
          const included = check.list.includes(value.value);
          if (!included && !check.exclude) {
            throw new Error("Value not in allowed list");
          }
          if (included && check.exclude) {
            throw new Error("Value in excluded list");
          }
        }
      }
      return SUCCESS(value);
    } catch (e) {
      this._addError(e as Error);
      return FAILURE;
    }
  }
}

type RawEntriesType = Record<string, PodspecType>;

export type BaseObjectOutputType<Shape extends RawEntriesType> = {
  [k in keyof Shape]: Shape[k]["_output"];
};

type optionalKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? k : never;
}[keyof T];
type requiredKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AddQuestionMarks<T extends object, _O = any> = {
  [K in requiredKeys<T>]: T[K];
} & {
  [K in optionalKeys<T>]?: T[K];
} & { [k in keyof T]?: unknown };

export type identity<T> = T;
export type Flatten<T> = identity<{ [k in keyof T]: T[k] }>;

export type objectOutputType<Shape extends RawEntriesType> = Flatten<
  AddQuestionMarks<BaseObjectOutputType<Shape>>
>;

export type baseObjectOutputType<Shape extends RawEntriesType> = {
  [k in keyof Shape]: Shape[k]["_output"];
};

type ParseSuccess<T> = { status: "valid"; value: T };
type ParseFailure = { status: "invalid" };

const FAILURE: ParseFailure = Object.freeze({ status: "invalid" });
const SUCCESS = <T>(value: T): ParseResult<T> => ({
  status: "valid",
  value
});

function isValid<T>(result: ParseResult<T>): result is ParseSuccess<T> {
  return result.status === "valid";
}

type ParseResult<T> = ParseSuccess<T> | ParseFailure;

type TupleSpec = {
  name: string;
  entries: string[];
  members: PODValue[][];
  exclude?: boolean;
};

type EntriesCheck = {
  kind: "tupleMembership";
  spec: TupleSpec;
};

class EntriesType<
  T extends RawEntriesType,
  Output = objectOutputType<T>
> extends PodspecType<Output, T, T> {
  private checks: EntriesCheck[] = [];

  static create<T extends RawEntriesType>(entries: T): EntriesType<T> {
    return new EntriesType(entries);
  }

  _parse(data: unknown): ParseResult<this["_output"]> {
    if (typeof data !== "object") {
      this._addError(new Error("Not an object"));
      return FAILURE;
    }

    if (data === null) {
      this._addError(new Error("Is null"));
      return FAILURE;
    }

    const result: PODEntries = {};

    try {
      for (const key in this.def) {
        if (!(key in data)) {
          this._addError(new Error(`Entry "${key}" is missing`));
          return FAILURE;
        }
      }
      for (const [key, value] of Object.entries(data)) {
        if (key in this.def) {
          // Will throw if the key is invalid
          checkPODName(key);
          const parsed = this.def[key].parse(value);
          result[key] = parsed;
        } else {
          // Skip? Maybe throw if there's an unexpected value here
        }
      }
    } catch (e) {
      // @todo don't use type assertion
      this._addError(e as Error);
      return FAILURE;
    }

    for (const check of this.checks) {
      if (check.kind === "tupleMembership") {
        const resultEntryKeys = Object.keys(result);
        const tuple: PODValue[] = [];
        for (const entryKey of check.spec.entries) {
          if (!resultEntryKeys.includes(entryKey)) {
            this._addError(
              new Error(
                `Entries do not contain an entry with key "${entryKey}", required by tuple ${check.spec.name}`
              )
            );
            return FAILURE;
          }
          tuple.push(result[entryKey]);
        }
        let matched = false;
        for (const tupleToCheck of check.spec.members) {
          const isMatching = tupleToCheck.every((val, index) =>
            isEqualPODValue(val, tuple[index])
          );
          if (isMatching) {
            if (check.spec.exclude) {
              // @todo better error messages
              this._addError(new Error("Tuple matched when it shouldn't"));
              return FAILURE;
            } else {
              matched = true;
              break;
            }
          }
        }
        if (!(check.spec.exclude ?? false) && !matched) {
          this._addError(new Error("Tuple did not match"));
          return FAILURE;
        }
      }
    }

    // @todo can we avoid the type assertion?
    return SUCCESS(result as Output);
  }

  public serialize(): T {
    return Object.fromEntries(
      Object.entries(this.def).map(([key, value]) => [key, value.serialize()])
    ) as T;
  }

  // @todo parameterize TupleSpec with known entry names?
  public matchTuple(spec: TupleSpec): typeof this {
    // @todo validate
    this.checks.push({
      kind: "tupleMembership",
      spec
    });
    return this;
  }

  public query(pods: POD[]): QueryResult {
    const matchingIndexes: number[] = [];
    const matches: POD[] = [];
    for (const [index, pod] of pods.entries()) {
      const result = this._parse(pod.content.asEntries());
      if (isValid(result)) {
        matchingIndexes.push(index);
        matches.push(pod);
      }
    }
    return {
      matches,
      matchingIndexes
    };
  }
}

interface QueryResult {
  matches: POD[];
  matchingIndexes: number[];
}

export const entries = EntriesType.create;
export const string = PodspecString.create;
export const integer = PodspecInteger.create;
export const cryptographic = PodspecCryptographic.create;
export const eddsaPubKey = PodspecEdDSAPubKey.create;

export const coerce = {
  string: (args?: CreateArgs<StringCheck>): PodspecString =>
    string({ ...args, coerce: true }),
  integer: (args?: CreateArgs<IntegerCheck>): PodspecInteger =>
    integer({ ...args, coerce: true }),
  cryptographic: (args?: CreateArgs<never>): PodspecCryptographic =>
    cryptographic({ ...args, coerce: true }),
  eddsaPubKey: (args?: CreateArgs<never>): PodspecEdDSAPubKey =>
    eddsaPubKey({ ...args, coerce: true })
};
