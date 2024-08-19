import { checkPODValue, PODStringValue } from "@pcd/pod";
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

/**
 * Checks if the given data has the correct shape for a POD string value.
 *
 * @param data - The data to check
 * @returns True if the data has the correct shape for a POD string value
 */
function isPODStringValue(data: unknown): data is PODStringValue {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  if (!("type" in data && "value" in data)) {
    return false;
  }
  if (data.type !== "string") {
    return false;
  }
  if (typeof data.value !== "string") {
    return false;
  }
  return true;
}

export type StringCheck = {
  kind: "list";
  list: string[];
  exclude?: boolean;
};

interface PodspecStringDef extends PodspecDataTypeDef {
  type: PodspecDataType.String;
  checks: StringCheck[];
  coerce: boolean;
}

export class PodspecString extends PodspecValue<
  PodspecStringDef,
  PODStringValue,
  string,
  PodspecStringDef
> {
  public list(list: string[], exclude = false): PodspecString {
    this.def.checks.push({
      kind: "list",
      list,
      exclude
    });
    return this;
  }

  public serialize(): PodspecStringDef {
    return {
      type: PodspecDataType.String,
      checks: structuredClone(this.def.checks),
      coerce: this.def.coerce
    };
  }

  _parse(data: unknown, params?: ParseParams): ParseResult<PODStringValue> {
    const issues: PodspecBaseIssue[] = [];
    let value: PODStringValue | undefined;
    if (isPODStringValue(data)) {
      value = data;
    } else if (this.def.coerce) {
      if (typeof data === "string") {
        value = {
          type: "string",
          value: data
        };
      }
    }

    if (value === undefined) {
      const issue: PodspecInvalidTypeIssue = {
        code: IssueCode.invalid_type,
        expectedType: PodspecDataType.String,
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

  public constructor(def: PodspecStringDef) {
    super(def);
  }

  static create(args?: CreateArgs<StringCheck>): PodspecString {
    return new PodspecString({
      type: PodspecDataType.String,
      checks: args?.checks ?? [],
      coerce: args?.coerce ?? false
    });
  }
}
