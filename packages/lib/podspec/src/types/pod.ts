import { POD, PODContent, PODEntries, PODValue } from "@pcd/pod";
import {
  IssueCode,
  PodspecError,
  PodspecExcludedByTupleListIssue,
  PodspecInvalidSignerIssue,
  PodspecInvalidTupleEntryIssue,
  PodspecNotInTupleListIssue
} from "../error";
import { FAILURE, ParsePath, ParseResult, SUCCESS } from "../parse";
import { isEqualPODValue, objectOutputType } from "../utils";
import { PodspecEntries, RawEntriesType, TupleSpec } from "./entries";
import { PodspecOptional } from "./optional";

type PODCheck =
  | {
      kind: "signer";
      signer: string;
    }
  | {
      kind: "signerList";
      signerList: string[];
    }
  | {
      kind: "tupleMembership";
      spec: TupleSpec;
    };

export type PodspecPODDef<T extends RawEntriesType> = {
  entries: PodspecEntries<T>;
  checks: PODCheck[];
};

interface StrongPODContent<T extends PODEntries> extends PODContent {
  asEntries(): T;
}

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

export class PodspecPOD<T extends RawEntriesType> {
  constructor(public readonly def: PodspecPODDef<T>) {}

  static create<T extends RawEntriesType>(entries: T): PodspecPOD<T> {
    return new PodspecPOD({
      entries: PodspecEntries.create(entries),
      checks: []
    });
  }

  public signer(signer: string): PodspecPOD<T> {
    return new PodspecPOD({
      entries: this.def.entries,
      checks: [{ kind: "signer", signer }]
    });
  }

  public signerList(signerList: string[]): PodspecPOD<T> {
    return new PodspecPOD({
      entries: this.def.entries,
      checks: [{ kind: "signerList", signerList }]
    });
  }

  public parse(
    data: POD
  ): StrongPOD<objectOutputType<RawEntriesTypeWithoutOptional<T>>> {
    const result = this.safeParse(data);

    if (!result.isValid) {
      throw new PodspecError(result.issues);
    }

    return result.value;
  }

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
        if (data.signerPublicKey !== check.signer) {
          const issue: PodspecInvalidSignerIssue = {
            code: IssueCode.invalid_signer,
            signer: data.signerPublicKey,
            list: [check.signer],
            path: ["signerPublicKey"]
          };
          issues.push(issue);
        }
      } else if (check.kind === "signerList") {
        if (!check.signerList.includes(data.signerPublicKey)) {
          const issue: PodspecInvalidSignerIssue = {
            code: IssueCode.invalid_signer,
            signer: data.signerPublicKey,
            list: check.signerList,
            path: ["signerPublicKey"]
          };
          issues.push(issue);
        }
      } else if (check.kind === "tupleMembership" && entriesResult.isValid) {
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

  // @todo parameterize TupleSpec with known entry names?
  public tuple(spec: TupleSpec): typeof this {
    // @todo validate
    this.def.checks.push({
      kind: "tupleMembership",
      spec
    });
    return this;
  }
}
