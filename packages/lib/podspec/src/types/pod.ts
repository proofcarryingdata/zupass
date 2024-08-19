import { POD, PODContent, PODEntries } from "@pcd/pod";
import { IssueCode, PodspecError, PodspecInvalidSignerIssue } from "../error";
import { FAILURE, ParseResult, SUCCESS } from "../parse";
import { objectOutputType } from "../utils";
import { PodspecEntries, RawEntriesType } from "./entries";
import { PodspecOptional } from "./optional";

type PODCheck =
  | {
      kind: "signer";
      signer: string;
    }
  | {
      kind: "signerList";
      signerList: string[];
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

    if (result.status === "invalid") {
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

    const issues =
      entriesResult.status === "invalid" ? entriesResult.issues : [];

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
}
