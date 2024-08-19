import { checkPODValue, PODEdDSAPublicKeyValue } from "@pcd/pod";
import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import {
  IssueCode,
  PodspecBaseIssue,
  PodspecExcludedByListIssue,
  PodspecInvalidPodValueIssue,
  PodspecInvalidTypeIssue,
  PodspecNotInListIssue
} from "../error";
import { FAILURE, ParseParams, ParseResult, SUCCESS } from "../parse";
import { assertUnreachable, CreateArgs } from "../utils";

function isPODEdDSAPublicKeyValue(
  data: unknown
): data is PODEdDSAPublicKeyValue {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  if (!("type" in data && "value" in data)) {
    return false;
  }
  if (data.type !== "eddsa_pubkey") {
    return false;
  }
  if (typeof data.value !== "string") {
    return false;
  }
  return true;
}

export type EdDSAPubKeyCheck = {
  kind: "list";
  list: string[];
  exclude?: boolean;
};

interface PodspecEdDSAPubKeyDef extends PodspecDataTypeDef {
  type: PodspecDataType.EdDSAPubKey;
  coerce: boolean;
  checks: EdDSAPubKeyCheck[];
}

export class PodspecEdDSAPubKey extends PodspecValue<
  PodspecEdDSAPubKeyDef,
  PODEdDSAPublicKeyValue,
  PODEdDSAPublicKeyValue | string
> {
  public list(list: string[], exclude = false): PodspecEdDSAPubKey {
    this.def.checks.push({
      kind: "list",
      list,
      exclude
    });
    return this;
  }

  _parse(
    data: unknown,
    params?: ParseParams
  ): ParseResult<PODEdDSAPublicKeyValue> {
    const issues: PodspecBaseIssue[] = [];

    let value: PODEdDSAPublicKeyValue | undefined;
    if (isPODEdDSAPublicKeyValue(data)) {
      value = data;
    } else {
      if (typeof data === "string") {
        value = {
          type: "eddsa_pubkey",
          value: data
        };
      }
    }

    if (value === undefined) {
      const issue: PodspecInvalidTypeIssue = {
        code: IssueCode.invalid_type,
        expectedType: PodspecDataType.EdDSAPubKey,
        actualType: typeof data,
        path: params?.path ?? []
      };
      issues.push(issue);
      return FAILURE(issues);
    }

    try {
      checkPODValue(params?.path?.[0] ?? "", value);
    } catch (error) {
      const issue: PodspecInvalidPodValueIssue = {
        code: IssueCode.invalid_pod_value,
        value: value,
        reason: (error as Error).message,
        path: params?.path ?? []
      };
      issues.push(issue);
      return FAILURE(issues);
    }

    for (const check of this.def.checks) {
      if (check.kind === "list") {
        const included = check.list.includes(value.value);
        if (!included && !check.exclude) {
          const issue: PodspecNotInListIssue = {
            code: IssueCode.not_in_list,
            value: value.value,
            list: check.list,
            path: params?.path ?? []
          };
          issues.push(issue);
        }
        if (included && check.exclude) {
          const issue: PodspecExcludedByListIssue = {
            code: IssueCode.excluded_by_list,
            value: value.value,
            list: check.list,
            path: params?.path ?? []
          };
          issues.push(issue);
        }
      } else {
        assertUnreachable(check.kind);
      }
    }

    if (issues.length > 0) {
      return FAILURE(issues);
    }

    return SUCCESS(value);
  }

  static create(args?: CreateArgs<EdDSAPubKeyCheck>): PodspecEdDSAPubKey {
    return new PodspecEdDSAPubKey({
      type: PodspecDataType.EdDSAPubKey,
      coerce: args?.coerce ?? false,
      checks: args?.checks ?? []
    });
  }

  public serialize(): PodspecEdDSAPubKeyDef {
    return {
      type: PodspecDataType.EdDSAPubKey,
      coerce: this.def.coerce,
      checks: structuredClone(this.def.checks)
    };
  }
}
