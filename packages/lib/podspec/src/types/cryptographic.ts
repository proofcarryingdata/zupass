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
import { PodspecOptional } from "./optional";

/**
 * Checks if the given data is a PODCryptographicValue.
 * Only checks that the data is an object with the correct properties, and does
 * not check that the value is within specific bounds.
 * @param data - The data to check.
 * @returns True if the data is a PODCryptographicValue, false otherwise.
 */
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

/**
 * Checks that can be performed on a PODCryptographicValue.
 */
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

/**
 * A Podspec type for a PODCryptographicValue.
 */
export class PodspecCryptographic extends PodspecValue<
  // The definition of the PodspecCryptographic.
  PodspecCryptographicDef,
  // The type of the value that the PodspecCryptographic outputs.
  PODCryptographicValue,
  // The type of the value that the PodspecCryptographic accepts (including coercion).
  PODIntValue | number | bigint
> {
  /**
   * Parses the given data into a PODCryptographicValue.
   * @param data - The data to parse.
   * @param params - The parse parameters.
   * @returns The parsed PODCryptographicValue, or an issue if the data is invalid.
   */
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

  /**
   * Adds a list check to the PODCryptographicValue.
   * @param list - The list of values to check against.
   * @param options - The options for the list check.
   * @returns A new PodspecCryptographicValue with the list check added.
   */
  public list(
    list: bigint[],
    options: { exclude: boolean } = { exclude: false }
  ): PodspecCryptographic {
    return new PodspecCryptographic({
      ...this.def,
      checks: [
        ...this.def.checks,
        { kind: "list", list, exclude: options.exclude }
      ]
    });
  }

  /**
   * Adds a range check to the PODCryptographicValue.
   * @param min - The minimum value to check against.
   * @param max - The maximum value to check against.
   * @returns A new PodspecCryptographicValue with the range check added.
   */
  public range(min: bigint, max: bigint): PodspecCryptographic {
    if (min < POD_CRYPTOGRAPHIC_MIN) {
      throw new Error("Minimum value out of bounds");
    }
    if (max > POD_CRYPTOGRAPHIC_MAX) {
      throw new Error("Maximum value out of bounds");
    }
    if (min > max) {
      throw new Error("Minimum value is greater than maximum value");
    }
    return new PodspecCryptographic({
      ...this.def,
      checks: [...this.def.checks, { kind: "range", min, max }]
    });
  }

  /**
   * Creates a new optional cryptographic Podspec.
   *
   * @returns The new optional cryptographic Podspec
   */
  public optional(): PodspecOptional<PodspecCryptographic> {
    return PodspecOptional.create(this);
  }

  /**
   * Creates a new PodspecCryptographicValue.
   *
   * See {@link CreateArgs} for more details.
   *
   * @param args - Optional arguments specifying checks and coercion.
   * @returns A new PodspecCryptographicValue.
   */
  static create(args?: CreateArgs<CryptographicCheck>): PodspecCryptographic {
    return new PodspecCryptographic({
      type: PodspecDataType.Cryptographic,
      coerce: args?.coerce ?? false,
      checks: args?.checks ?? []
    });
  }

  /**
   * Serializes the PodspecCryptographicValue into a PodspecCryptographicDef.
   * The result is a cloneable object, but may not be safe to serialize to
   * JSON due to the presence of bigint values.
   *
   * @returns The serialized PodspecCryptographicDef.
   */
  public serialize(): PodspecCryptographicDef {
    return {
      type: PodspecDataType.Cryptographic,
      coerce: this.def.coerce,
      checks: structuredClone(this.def.checks)
    };
  }
}
