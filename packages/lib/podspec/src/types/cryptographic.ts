import {
  checkPODValue,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  PODCryptographicValue,
  PODIntValue
} from "@pcd/pod";
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

function isPODCryptographicValue(data: unknown): data is PODCryptographicValue {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  if (!("type" in data && "value" in data)) {
    return false;
  }
  if (data.type !== "cryptographic") {
    return false;
  }
  if (typeof data.value !== "bigint") {
    return false;
  }
  return true;
}

export type CryptographicCheck =
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

interface PodspecCryptographicDef extends PodspecDataTypeDef {
  type: PodspecDataType.Cryptographic;
  coerce: boolean;
  checks: CryptographicCheck[];
}

export class PodspecCryptographic extends PodspecValue<
  PodspecCryptographicDef,
  PODCryptographicValue,
  PODIntValue | number | bigint
> {
  _parse(
    data: unknown,
    params?: ParseParams
  ): ParseResult<PODCryptographicValue> {
    const issues: PodspecBaseIssue[] = [];

    let value: PODCryptographicValue | undefined;
    if (isPODCryptographicValue(data)) {
      value = data;
    } else if (this.def.coerce) {
      if (typeof data === "number") {
        value = {
          type: "cryptographic",
          value: BigInt(data)
        };
      } else if (typeof data === "bigint") {
        value = {
          type: "cryptographic",
          value: data
        };
      }
    }

    if (value === undefined) {
      const issue: PodspecInvalidTypeIssue = {
        code: IssueCode.invalid_type,
        expectedType: PodspecDataType.Cryptographic,
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
    if (min < POD_CRYPTOGRAPHIC_MIN) {
      throw new Error("Minimum value out of bounds");
    }
    if (max > POD_CRYPTOGRAPHIC_MAX) {
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

  static create(args?: CreateArgs<CryptographicCheck>): PodspecCryptographic {
    return new PodspecCryptographic({
      type: PodspecDataType.Cryptographic,
      coerce: args?.coerce ?? false,
      checks: args?.checks ?? []
    });
  }

  public serialize(): PodspecCryptographicDef {
    return {
      type: PodspecDataType.Cryptographic,
      coerce: this.def.coerce,
      checks: structuredClone(this.def.checks)
    };
  }
}
