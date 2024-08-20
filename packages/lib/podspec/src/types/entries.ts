import { PODEntries, PODValue, checkPODName } from "@pcd/pod";
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

/**
 * The type of the entries that the PodspecEntries can parse.
 * Mirrors the structure of {@link PODEntries}, with the addition of
 * PodspecOptional. Optional values are values that can be omitted from the
 * POD without causing the POD to be invalid, and are either present or
 * omitted rather than being undefined.
 */
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

/**
 * Specification for a tuple of POD entries, and a list of tuples that are
 * considered valid. If the exclude flag is set, then the list becomes an
 * exclusion list, and the tuple must not match any of the tuples in the list.
 */
export type TupleSpec = {
  name: string;
  entries: string[];
  members: PODValue[][];
  exclude?: boolean;
};

/**
 * Types of checks that can be performed on the entries.
 */
type PodspecCheck = {
  kind: "tupleMembership";
  spec: TupleSpec;
};

/**
 * Definition of a set of entries and the checks that should be performed on them.
 */
export type PodspecEntriesDef<T extends RawEntriesType> = {
  entries: T;
  checks: PodspecCheck[];
};

/**
 * Serialized definition of a set of entries and the checks that should be
 * performed on them.
 *
 * The serialized definition is a cloneable object, but may not be safe to
 * serialize to JSON due to the presence of bigint values.
 *
 * Initial use of this is for the Z API, where queries must be serialized
 * before being sent to the wallet.
 */
export interface PodspecEntriesSerializedDef<T extends RawEntriesType> {
  entries: SerializedEntriesType<T>;
  checks: PodspecCheck[];
}

type SerializedEntriesType<T extends RawEntriesType> = {
  [k in keyof T]: T[k]["def"];
};

/**
 * Podspec for a set of entries and the checks that should be performed on them.
 */
export class PodspecEntries<
  // The type of the entries that the PodspecEntries can parse.
  E extends RawEntriesType,
  // The type of the output that the PodspecEntries can parse into.
  // This is derived from the input type, as the input value contains the keys
  // which determine the keys present in the resulting PODEntries.
  Output = objectOutputType<E>
> {
  public constructor(public def: PodspecEntriesDef<E>) {}

  /**
   * Parses the given data into the output type.
   * Will throw an exception if the data is invalid.
   *
   * @param data - The data to parse.
   * @param params - Optional parameters for the parse operation.
   * @returns The parsed output.
   */
  public parse(data: unknown, params?: ParseParams): Output {
    const result = this.safeParse(data, params);
    if (isValid(result)) {
      return result.value;
    }
    throw new PodspecError(result.issues);
  }

  /**
   * Parses the given data into the output type, returning a ParseResult.
   * Will not throw an exception, in contrast to {@link parse}.
   *
   * @param data - The data to parse.
   * @param params - Optional parameters for the parse operation.
   * @returns The parse result.
   */
  public safeParse(data: unknown, params?: ParseParams): ParseResult<Output> {
    return this._parse(data, params);
  }

  /**
   * Parses the given data into the output type, returning a ParseResult.
   * Meant for internal use rather than as an external API.
   *
   * @param data - The data to parse.
   * @param params - Optional parameters for the parse operation.
   * @returns The parse result.
   */
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

  /**
   * Adds a tuple membership check to the Podspec.
   *
   * @param spec - The tuple specification.
   * @returns The Podspec with the tuple membership check added.
   */
  public tuple(spec: TupleSpec): typeof this {
    // @todo validate this before adding it
    this.def.checks.push({
      kind: "tupleMembership",
      spec
    });
    return this;
  }

  /**
   * Serializes the Podspec into a cloneable object.
   *
   * The serialized may not be safe to serialize to JSON due to the presence
   * of bigint values.
   *
   * @returns The serialized Podspec.
   */
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

  /**
   * Deserializes a serialized PodspecEntries.
   * Note that this is not the same as deserializing PodspecPOD.
   * See {@link PodspecPOD.deserialize} for that.
   *
   * The initial use of this is for the Z API, where queries must be
   * serialized before being sent to the wallet, and the wallet must be able
   * to deserialize them.
   *
   * @param serialized - The serialized Podspec.
   * @returns The deserialized Podspec.
   */
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

  /**
   * Creates a new Podspec from a set of entry specs.
   *
   * @param entries - The entry specs to create the Podspec from.
   * @returns The new Podspec.
   */
  static create<E extends RawEntriesType>(entries: E): PodspecEntries<E> {
    return new PodspecEntries({ entries, checks: [] });
  }
}
