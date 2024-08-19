import { checkPODValue, POD_INT_MAX, POD_INT_MIN, PODIntValue } from "@pcd/pod";
import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import {
  IssueCode,
  PodspecBaseIssue,
  PodspecExcludedByListIssue,
  PodspecInvalidPodValueIssue,
  PodspecInvalidTypeIssue,
  PodspecNotInListIssue,
  PodspecNotInRangeIssue
} from "../error";
import { FAILURE, ParseParams, ParseResult, SUCCESS } from "../parse";
import { assertUnreachable, CreateArgs } from "../utils";

/**
 * Checks if the given data has the correct shape for a POD integer value.
 * Does not check the bounds of the integer.
 *
 * @param data - The data to check
 * @returns True if the data has the correct shape for a POD integer value
 */
function isPODIntValue(data: unknown): data is PODIntValue {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  if (!("type" in data && "value" in data)) {
    return false;
  }
  if (data.type !== "int") {
    return false;
  }
  if (typeof data.value !== "bigint") {
    return false;
  }
  return true;
}

export type IntCheck =
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

interface PodspecIntDef extends PodspecDataTypeDef {
  type: PodspecDataType.Int;
  checks: IntCheck[];
  coerce: boolean;
}

export class PodspecInt extends PodspecValue<
  PodspecIntDef,
  PODIntValue,
  PODIntValue | number | bigint
> {
  _parse(data: unknown, params?: ParseParams): ParseResult<PODIntValue> {
    const issues: PodspecBaseIssue[] = [];

    let value: PODIntValue | undefined;
    if (isPODIntValue(data)) {
      value = data;
    } else if (this.def.coerce) {
      if (typeof data === "number") {
        value = {
          type: "int",
          value: BigInt(data)
        };
      } else if (typeof data === "bigint") {
        value = {
          type: "int",
          value: data
        };
      }
    }

    if (value === undefined) {
      const issue: PodspecInvalidTypeIssue = {
        code: IssueCode.invalid_type,
        expectedType: PodspecDataType.Int,
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
      if (check.kind === "range") {
        if (value.value < check.min || value.value > check.max) {
          const issue: PodspecNotInRangeIssue = {
            code: IssueCode.not_in_range,
            value: value.value,
            min: check.min,
            max: check.max,
            path: params?.path ?? []
          };
          issues.push(issue);
        }
      } else if (check.kind === "list") {
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
        assertUnreachable(check);
      }
    }

    if (issues.length > 0) {
      return FAILURE(issues);
    }

    return SUCCESS(value);
  }

  public list(
    list: bigint[],
    options: { exclude: boolean } = { exclude: false }
  ): typeof this {
    this.def.checks.push({
      kind: "list",
      list,
      exclude: options.exclude
    });
    return this;
  }

  public range(min: bigint, max: bigint): typeof this {
    if (min < POD_INT_MIN) {
      throw new Error("Minimum value out of bounds");
    }
    if (max > POD_INT_MAX) {
      throw new Error("Maximum value out of bounds");
    }
    if (min > max) {
      throw new Error("Minimum value is greater than maximum value");
    }
    this.def.checks.push({
      kind: "range",
      min,
      max
    });
    return this;
  }

  static create(args?: CreateArgs<IntCheck>): PodspecInt {
    return new PodspecInt({
      type: PodspecDataType.Int,
      checks: args?.checks ?? [],
      coerce: args?.coerce ?? false
    });
  }

  public serialize(): PodspecIntDef {
    return {
      type: PodspecDataType.Int,
      checks: structuredClone(this.def.checks),
      coerce: this.def.coerce
    };
  }
}
