import { POD, PODEntries, PODValue, checkPODName } from "@pcd/pod";
import { PodspecDataType } from "../base";
import {
  IssueCode,
  PodspecBaseIssue,
  PodspecError,
  PodspecExcludedByTupleListIssue,
  PodspecInvalidEntryNameIssue,
  PodspecInvalidTupleEntryIssue,
  PodspecInvalidTypeIssue,
  PodspecMissingEntryIssue,
  PodspecNotInTupleListIssue
} from "../error";
import { FAILURE, ParseParams, ParseResult, SUCCESS, isValid } from "../parse";
import { isEqualPODValue, objectOutputType } from "../utils";
import { PodspecCryptographic } from "./cryptographic";
import { PodspecEdDSAPubKey } from "./eddsa_pubkey";
import { PodspecInt } from "./int";
import { PodspecOptional } from "./optional";
import { PodspecString } from "./string";

export type RawEntriesType = Record<
  string,
  | PodspecString
  | PodspecInt
  | PodspecCryptographic
  | PodspecEdDSAPubKey
  | PodspecOptional<
      PodspecString | PodspecInt | PodspecCryptographic | PodspecEdDSAPubKey
    >
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

  _parse(data: unknown, params?: ParseParams): ParseResult<Output> {
    const path = params?.path ?? [];
    if (typeof data !== "object") {
      const issue: PodspecInvalidTypeIssue = {
        code: IssueCode.invalid_type,
        expectedType: "object",
        actualType: typeof data,
        path
      };
      return FAILURE([issue]);
    }

    if (data === null) {
      const issue: PodspecInvalidTypeIssue = {
        code: IssueCode.invalid_type,
        expectedType: "object",
        actualType: "null",
        path
      };
      return FAILURE([issue]);
    }

    const issues: PodspecBaseIssue[] = [];
    const result: PODEntries = {};

    for (const key in this.def.entries) {
      if (
        !(key in data) &&
        !(this.def.entries[key] instanceof PodspecOptional)
      ) {
        const issue: PodspecMissingEntryIssue = {
          code: IssueCode.missing_entry,
          key,
          path: [...path, key]
        };
        issues.push(issue);
      }
    }
    for (const [key, value] of Object.entries(data)) {
      if (key in this.def.entries) {
        try {
          // Will throw if the key is invalid
          checkPODName(key);
        } catch (e) {
          const issue: PodspecInvalidEntryNameIssue = {
            code: IssueCode.invalid_entry_name,
            name: key,
            description: (e as Error).message,
            path: [...path, key]
          };
          issues.push(issue);
        }
        const parsedEntry = this.def.entries[key].safeParse(value, {
          path: [...path, key]
        });
        // parsed might be undefined if the type is optional
        if (isValid(parsedEntry)) {
          if (parsedEntry.value !== undefined) {
            result[key] = parsedEntry.value;
          }
        } else {
          issues.push(...parsedEntry.issues);
        }
      } else {
        // Might want a parsing mode that rejects unexpected values here
        // By default, ignore them and do not include them in the parsed result
      }
    }

    for (const check of this.def.checks) {
      if (check.kind === "tupleMembership") {
        const resultEntryKeys = Object.keys(result);
        const tuple: PODValue[] = [];
        let validTuple = true;
        for (const entryKey of check.spec.entries) {
          if (!resultEntryKeys.includes(entryKey)) {
            validTuple = false;
            const issue: PodspecInvalidTupleEntryIssue = {
              code: IssueCode.invalid_tuple_entry,
              name: entryKey,
              path: [...path, entryKey]
            };
            issues.push(issue);
          }
          tuple.push(result[entryKey]);
        }
        if (!validTuple) {
          return FAILURE(issues);
        }
        let matched = false;
        for (const tupleToCheck of check.spec.members) {
          const isMatching = tupleToCheck.every((val, index) =>
            isEqualPODValue(val, tuple[index])
          );
          if (isMatching) {
            if (check.spec.exclude) {
              const issue: PodspecExcludedByTupleListIssue = {
                code: IssueCode.excluded_by_tuple_list,
                value: tuple,
                list: check.spec.members,
                path
              };
              issues.push(issue);
            } else {
              matched = true;
              break;
            }
          }
        }
        if (!(check.spec.exclude ?? false) && !matched) {
          const issue: PodspecNotInTupleListIssue = {
            code: IssueCode.not_in_tuple_list,
            value: tuple,
            list: check.spec.members,
            path
          };
          issues.push(issue);
        }
      }
    }

    if (issues.length > 0) {
      return FAILURE(issues);
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

  static deserialize<E extends RawEntriesType>(
    serialized: PodspecEntriesSerializedDef<E>
  ): PodspecEntries<E> {
    const deserializedEntries: RawEntriesType = {};

    for (const [key, value] of Object.entries(serialized.entries)) {
      switch (value.type) {
        case PodspecDataType.String:
          deserializedEntries[key] = PodspecString.create(value);
          break;
        case PodspecDataType.Int:
          deserializedEntries[key] = PodspecInt.create(value);
          break;
        case PodspecDataType.Cryptographic:
          deserializedEntries[key] = PodspecCryptographic.create(value);
          break;
        case PodspecDataType.EdDSAPubKey:
          deserializedEntries[key] = PodspecEdDSAPubKey.create(value);
          break;
        case PodspecDataType.Optional:
          deserializedEntries[key] = PodspecOptional.create(value);
          break;
        default:
          throw new Error(`Unsupported PodspecDataType: ${value.type}`);
      }
    }

    const podspecEntries = new PodspecEntries<E>({
      entries: deserializedEntries as E,
      checks: serialized.checks
    });

    return podspecEntries;
  }

  static create<E extends RawEntriesType>(entries: E): PodspecEntries<E> {
    return new PodspecEntries({ entries, checks: [] });
  }
}
