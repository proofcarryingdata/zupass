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
import { PodspecOptional } from "./optional";

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

/**
 * The checks that can be applied to an integer POD.
 */
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

/**
 * Podspec for an integer POD.
 */
export class PodspecInt extends PodspecValue<
  // The definition of the Podspec
  PodspecIntDef,
  // The output value for the Podspec
  PODIntValue,
  // The input value for the Podspec, including coercion
  PODIntValue | number | bigint
> {
  /**
   * Parses the input data into an integer POD.
   *
   * @param data - The input data to parse
   * @param params - The parse parameters
   * @returns The parsed integer POD
   */
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

  /**
   * Adds a list check to the integer POD.
   *
   * @param list - The list of values to check against
   * @param options - The options for the list check
   * @returns The integer POD with the list check added
   */
  public list(
    list: bigint[],
    options: { exclude: boolean } = { exclude: false }
  ): PodspecInt {
    return new PodspecInt({
      ...this.def,
      checks: [
        ...this.def.checks,
        { kind: "list", list, exclude: options.exclude }
      ]
    });
  }

  /**
   * Adds a range check to the integer POD.
   *
   * @param min - The minimum value to check against
   * @param max - The maximum value to check against
   * @returns The integer POD with the range check added
   */
  public range(min: bigint, max: bigint): PodspecInt {
    if (min < POD_INT_MIN) {
      throw new Error("Minimum value out of bounds");
    }
    if (max > POD_INT_MAX) {
      throw new Error("Maximum value out of bounds");
    }
    if (min > max) {
      throw new Error("Minimum value is greater than maximum value");
    }

    return new PodspecInt({
      ...this.def,
      checks: [...this.def.checks, { kind: "range", min, max }]
    });
  }

  /**
   * Creates a new optional integer Podspec.
   *
   * @returns The new optional integer Podspec
   */
  public optional(): PodspecOptional<PodspecInt> {
    return PodspecOptional.create(this);
  }

  /**
   * Creates a new integer Podspec.
   *
   * @param args - The arguments for the integer Podspec
   * @returns The integer Podspec
   */
  static create(args?: CreateArgs<IntCheck>): PodspecInt {
    return new PodspecInt({
      type: PodspecDataType.Int,
      checks: args?.checks ?? [],
      coerce: args?.coerce ?? false
    });
  }

  /**
   * Serializes the integer Podspec to a cloneable object.
   * This may not be safe to serialize as JSON due to the presence of bigint
   * values.
   *
   * @returns The serialized integer Podspec
   */
  public serialize(): PodspecIntDef {
    return {
      type: PodspecDataType.Int,
      checks: structuredClone(this.def.checks),
      coerce: this.def.coerce
    };
  }
}
