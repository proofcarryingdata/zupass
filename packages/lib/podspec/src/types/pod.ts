import { POD, PODContent, PODEntries, PODValue } from "@pcd/pod";
import {
  IssueCode,
  PodspecError,
  PodspecExcludedByTupleListIssue,
  PodspecIncorrectSignatureIssue,
  PodspecIncorrectSignerIssue,
  PodspecInvalidTupleEntryIssue,
  PodspecNotInTupleListIssue
} from "../error";
import { FAILURE, ParsePath, ParseResult, SUCCESS } from "../parse";
import { assertUnreachable, isEqualPODValue, objectOutputType } from "../utils";
import {
  PodspecEntries,
  PodspecEntriesSerializedDef,
  RawEntriesType,
  TupleSpec
} from "./entries";
import { PodspecOptional } from "./optional";

/**
 * Types of checks that can be applied to a POD.
 */
type PODCheck =
  | {
      kind: "signer";
      signer: string;
      exclude: boolean;
    }
  | {
      kind: "signerList";
      signerList: string[];
      exclude: boolean;
    }
  | {
      kind: "tupleMembership";
      spec: TupleSpec;
    }
  | {
      kind: "signature";
      signature: string;
      exclude: boolean;
    }
  | {
      kind: "signatureList";
      signatureList: string[];
      exclude: boolean;
    };

/**
 * The definition of a Podspec for a whole POD.
 */
export type PodspecPODDef<T extends RawEntriesType> = {
  entries: PodspecEntries<T>;
  checks: PODCheck[];
};

/**
 * "Strong" PODContent is an extension of PODContent which extends the
 * `asEntries()` method to return a strongly-typed PODEntries.
 */
interface StrongPODContent<T extends PODEntries> extends PODContent {
  asEntries(): T;
}

/**
 * A "strong" POD is a POD with a strongly-typed entries.
 */
interface StrongPOD<T extends PODEntries> extends POD {
  content: StrongPODContent<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcludeOptional<T> = T extends PodspecOptional<any> ? never : T;

// PODEntries does not support a concept of optional entries, in the sense that
// no PODEntry can be undefined. Given that we need to match the type of
// PODEntries in StrongPODContent.asEntries(), we need to remove the optional
// entries from the RawEntriesType. This means that they won't show up in the
// resulting type, but this seems like a reasonable tradeoff to fit in the
// existing type system.
export type RawEntriesTypeWithoutOptional<T extends RawEntriesType> = {
  [K in keyof T]: ExcludeOptional<T[K]>;
};

export interface SerializedPodspecPOD<T extends RawEntriesType> {
  entries: PodspecEntriesSerializedDef<T>;
  checks: PODCheck[];
}

/**
 * Result of a query over a set of PODs.
 */
interface QueryResult {
  matches: POD[];
  matchingIndexes: number[];
}

/**
 * A Podspec for a whole POD.
 */
export class PodspecPOD<T extends RawEntriesType> {
  constructor(public readonly def: PodspecPODDef<T>) {}

  /**
   * Creates a new Podspec for a whole POD.
   *
   * @param entries - The entries of the POD.
   * @returns The new Podspec.
   */
  static create<T extends RawEntriesType>(entries: T): PodspecPOD<T> {
    return new PodspecPOD({
      entries: PodspecEntries.create(entries),
      checks: []
    });
  }

  /**
   * Returns a new Podspec instance with a check on the value of the signer.
   *
   * @param signer - The signer of the POD.
   * @returns The new Podspec.
   */
  public signer(signer: string, exclude: boolean = false): PodspecPOD<T> {
    return new PodspecPOD({
      entries: this.def.entries,
      checks: [{ kind: "signer", signer, exclude }]
    });
  }

  /**
   * Returns a new Podspec instance which checks the signer public key against
   * a list of allowed signers.
   *
   * @param signerList - The list of signers of the POD.
   * @returns The new Podspec.
   */
  public signerList(
    signerList: string[],
    exclude: boolean = false
  ): PodspecPOD<T> {
    return new PodspecPOD({
      entries: this.def.entries,
      checks: [{ kind: "signerList", signerList, exclude }]
    });
  }

  /**
   * Returns a new Podspec instance with a check on the signature.
   *
   * @param signature - The signature of the POD.
   * @returns The new Podspec.
   */
  public signature(signature: string, exclude: boolean = false): PodspecPOD<T> {
    return new PodspecPOD({
      entries: this.def.entries,
      checks: [{ kind: "signature", signature, exclude }]
    });
  }

  /**
   * Returns a new Podspec instance, checking the signature against a list of
   * allowed signatures.
   *
   * @param signatureList - The list of signatures of the POD.
   * @returns The new Podspec.
   */
  public signatureList(
    signatureList: string[],
    exclude: boolean = false
  ): PodspecPOD<T> {
    return new PodspecPOD({
      entries: this.def.entries,
      checks: [{ kind: "signatureList", signatureList, exclude }]
    });
  }

  /**
   * Parses the given POD into a strongly-typed POD. Will throw an exception if
   * the POD does not match the spec.
   *
   * @param data - The POD to parse.
   * @returns The parsed POD.
   */
  public parse(
    data: POD
  ): StrongPOD<objectOutputType<RawEntriesTypeWithoutOptional<T>>> {
    const result = this.safeParse(data);

    if (!result.isValid) {
      throw new PodspecError(result.issues);
    }

    return result.value;
  }

  /**
   * Parses the given POD into a strongly-typed POD. Returns a ParseResult
   * instead of throwing an exception.
   *
   * @param data - The POD to parse.
   * @returns The parsed POD.
   */
  public safeParse(
    data: POD
  ): ParseResult<
    StrongPOD<objectOutputType<RawEntriesTypeWithoutOptional<T>>>
  > {
    const entriesResult = this.def.entries.safeParse(data.content.asEntries(), {
      path: ["entries"]
    });

    const issues = !entriesResult.isValid ? entriesResult.issues : [];
    const path: ParsePath = [];

    for (const check of this.def.checks) {
      if (check.kind === "signer") {
        const signerMatches = data.signerPublicKey === check.signer;
        if (
          (!signerMatches && !check.exclude) ||
          (signerMatches && check.exclude)
        ) {
          const issue: PodspecIncorrectSignerIssue = {
            code: IssueCode.incorrect_signer,
            signer: data.signerPublicKey,
            list: [check.signer],
            path: ["signerPublicKey"]
          };
          issues.push(issue);
        }
      } else if (check.kind === "signerList") {
        const signerInList = check.signerList.includes(data.signerPublicKey);
        if (
          (!signerInList && !check.exclude) ||
          (signerInList && check.exclude)
        ) {
          const issue: PodspecIncorrectSignerIssue = {
            code: IssueCode.incorrect_signer,
            signer: data.signerPublicKey,
            list: check.signerList,
            path: ["signerPublicKey"]
          };
          issues.push(issue);
        }
      } else if (check.kind === "signature") {
        const signatureMatches = data.signature === check.signature;
        if (
          (!signatureMatches && !check.exclude) ||
          (signatureMatches && check.exclude)
        ) {
          const issue: PodspecIncorrectSignatureIssue = {
            code: IssueCode.incorrect_signature,
            signature: data.signature,
            list: [check.signature],
            path: ["signature"]
          };
          issues.push(issue);
        }
      } else if (check.kind === "signatureList") {
        const signatureInList = check.signatureList.includes(data.signature);
        if (
          (!signatureInList && !check.exclude) ||
          (signatureInList && check.exclude)
        ) {
          const issue: PodspecIncorrectSignatureIssue = {
            code: IssueCode.incorrect_signature,
            signature: data.signature,
            list: check.signatureList,
            path: ["signature"]
          };
          issues.push(issue);
        }
      } else if (check.kind === "tupleMembership") {
        if (!entriesResult.isValid) {
          return FAILURE(issues);
        }
        const resultEntryKeys = [
          ...Object.keys(entriesResult.value),
          "$signerPublicKey"
        ];
        const podEntries = {
          ...entriesResult.value,
          $signerPublicKey: {
            type: "eddsa_pubkey",
            value: data.signerPublicKey
          }
        };
        const tuple: PODValue[] = [];
        let validTuple = true;
        for (const entryKey of check.spec.entries) {
          const entry = podEntries[entryKey];
          if (!resultEntryKeys.includes(entryKey) || entry === undefined) {
            validTuple = false;
            const issue: PodspecInvalidTupleEntryIssue = {
              code: IssueCode.invalid_tuple_entry,
              name: entryKey,
              path: [entryKey]
            };
            issues.push(issue);
            continue;
          }
          tuple.push(entry);
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
      } else {
        assertUnreachable(check);
      }
    }

    if (issues.length > 0) {
      return FAILURE(issues);
    }

    return SUCCESS(
      // We can return the POD as is, since we know it matches the spec, but
      //with a type that tells TypeScript what entries it has
      data as StrongPOD<objectOutputType<RawEntriesTypeWithoutOptional<T>>>
    );
  }

  /**
   * Serializes the Podspec into a format that can be cloned.
   *
   * @returns The serialized Podspec.
   */
  public serialize(): SerializedPodspecPOD<T> {
    return {
      entries: this.def.entries.serialize(),
      checks: this.def.checks
    };
  }

  /**
   * Deserializes a serialized Podspec.
   *
   * @param serialized - The serialized Podspec.
   * @returns The deserialized Podspec.
   */
  public static deserialize<T extends RawEntriesType>(
    serialized: SerializedPodspecPOD<T>
  ): PodspecPOD<T> {
    return new PodspecPOD({
      entries: PodspecEntries.deserialize(serialized.entries),
      checks: serialized.checks
    });
  }

  /**
   * Returns a new Podspec instance with a tuple membership check.
   *
   * @param spec - The tuple spec.
   * @returns The new Podspec.
   */
  public tuple(spec: TupleSpec): PodspecPOD<T> {
    return new PodspecPOD<T>({
      entries: this.def.entries,
      checks: [...this.def.checks, { kind: "tupleMembership", spec }]
    });
  }

  /**
   * Queries a set of PODs against the Podspec.
   * If you want to query a single POD, use {@link parse} instead.
   * If you want the query to include POD-level metadata such as signer public
   * key, use {@link PodspecPOD.query} instead.
   *
   * @param pods - The pods to query.
   * @returns The query result.
   */
  public query(pods: POD[]): QueryResult {
    const matchingIndexes: number[] = [];
    const matches: POD[] = [];
    for (const [index, pod] of pods.entries()) {
      const result = this.safeParse(pod);
      if (result.isValid) {
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
