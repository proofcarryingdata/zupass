import { POD, PODEntries, PODValue, checkPODName } from "@pcd/pod";
import { FAILURE, ParseResult, SUCCESS, isValid } from "./parse";
import { PodspecCryptographic } from "./types/cryptographic";
import { PodspecEdDSAPubKey } from "./types/eddsa_pubkey";
import { PodspecInt } from "./types/int";
import { PodspecOptional } from "./types/optional";
import { PodspecString } from "./types/string";
import { isEqualPODValue, objectOutputType } from "./utils";

export type RawEntriesType = Record<
  string,
  | PodspecString
  | PodspecInt
  | PodspecCryptographic
  | PodspecEdDSAPubKey
  | PodspecOptional<PodspecString>
>;

type TupleSpec = {
  name: string;
  entries: string[];
  members: PODValue[][];
  exclude?: boolean;
};

type PodspecCheck = {
  kind: "tupleMembership";
  spec: TupleSpec;
};

export type PodspecEntriesDef<T extends RawEntriesType> = {
  entries: T;
  checks: PodspecCheck[];
};

interface QueryResult {
  matches: POD[];
  matchingIndexes: number[];
}

interface PodspecEntriesSerializedDef<T extends RawEntriesType> {
  entries: SerializedEntriesType<T>;
  checks: PodspecCheck[];
}

type SerializedEntriesType<T extends RawEntriesType> = {
  [k in keyof T]: T[k]["def"];
};

export class PodspecEntries<
  E extends RawEntriesType,
  Output = objectOutputType<E>
> {
  readonly errors: Error[] = [];

  private _addError(e: Error): void {
    this.errors.push(e);
  }

  public constructor(public def: PodspecEntriesDef<E>) {}

  public parse(data: unknown): Output {
    return data as Output;
  }

  public safeParse(data: unknown): ParseResult<Output> {
    return this._parse(data);
  }

  _parse(data: unknown): ParseResult<Output> {
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
      for (const key in this.def.entries) {
        if (
          !(key in data) &&
          !(this.def.entries[key] instanceof PodspecOptional)
        ) {
          this._addError(new Error(`Entry "${key}" is missing`));
          return FAILURE;
        }
      }
      for (const [key, value] of Object.entries(data)) {
        if (key in this.def.entries) {
          // Will throw if the key is invalid
          checkPODName(key);
          const parsed = this.def.entries[key].parse(value);
          // parsed might be undefined if the type is optional
          if (parsed) {
            result[key] = parsed;
          }
        } else {
          // Skip? Maybe throw if there's an unexpected value here
        }
      }
    } catch (e) {
      // @todo don't use type assertion
      this._addError(e as Error);
      return FAILURE;
    }

    for (const check of this.def.checks) {
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

    return SUCCESS(result as Output);
  }

  // @todo parameterize TupleSpec with known entry names?
  public matchTuple(spec: TupleSpec): typeof this {
    // @todo validate
    this.def.checks.push({
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

  public serialize(): PodspecEntriesSerializedDef<E> {
    return {
      checks: structuredClone(this.def.checks),
      entries: Object.fromEntries(
        Object.entries(this.def.entries).map(([key, value]) => [
          key,
          value.serialize()
        ])
      )
    } as PodspecEntriesSerializedDef<E>;
  }

  static create<E extends RawEntriesType>(entries: E): PodspecEntries<E> {
    return new PodspecEntries({ entries, checks: [] });
  }
}
