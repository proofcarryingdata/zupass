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
import { PodspecOptional } from "./optional";

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

/**
 * Checks that can be added to a string Podspec.
 */
export type StringCheck = {
  kind: "list";
  list: string[];
  exclude?: boolean;
};

/**
 * The definition of a string Podspec.
 */
interface PodspecStringDef extends PodspecDataTypeDef {
  type: PodspecDataType.String;
  checks: StringCheck[];
  coerce: boolean;
}

/**
 * A Podspec type for a POD string value.
 */
export class PodspecString extends PodspecValue<
  // The definition of the PodspecString.
  PodspecStringDef,
  // The type of the value that the PodspecString outputs.
  PODStringValue,
  // The type of the value that the PodspecString accepts (including coercion).
  PODStringValue | string,
  // The serialized form of the PodspecString.
  PodspecStringDef
> {
  /**
   * Adds a list check to the PodspecString.
   *
   * @param list - The list of strings to check against.
   * @param options - The options for the list check.
   * @returns The PodspecString.
   */
  public list(
    list: string[],
    options: { exclude: boolean } = { exclude: false }
  ): PodspecString {
    return new PodspecString({
      ...this.def,
      checks: [
        ...this.def.checks,
        { kind: "list", list, exclude: options.exclude }
      ]
    });
  }

  /**
   * Serializes the string Podspec to a cloneable object.
   *
   * @returns The serialized string Podspec
   */
  public serialize(): PodspecStringDef {
    return {
      type: PodspecDataType.String,
      checks: structuredClone(this.def.checks),
      coerce: this.def.coerce
    };
  }

  /**
   * Parses the given data into a POD string value.
   *
   * @param data - The data to parse.
   * @returns The parsed POD string value, or an issue if the data is invalid.
   */
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

  /**
   * Creates a new optional string Podspec.
   *
   * @returns The new optional string Podspec
   */
  public optional(): PodspecOptional<PodspecString> {
    return PodspecOptional.create(this);
  }

  /**
   * Creates a new string Podspec.
   *
   * @param args - The arguments for the string Podspec.
   * @returns The new string Podspec.
   */
  static create(args?: CreateArgs<StringCheck>): PodspecString {
    return new PodspecString({
      type: PodspecDataType.String,
      checks: args?.checks ?? [],
      coerce: args?.coerce ?? false
    });
  }
}
