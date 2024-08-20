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

/**
 * Checks if the given data is a PODEdDSAPublicKeyValue.
 * @param data - The data to check.
 * @returns True if the data is a PODEdDSAPublicKeyValue, false otherwise.
 */
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

/**
 * Checks that can be applied to a PodspecEdDSAPubKey.
 */
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

/**
 * A Podspec type for a PODEdDSAPublicKeyValue.
 */
export class PodspecEdDSAPubKey extends PodspecValue<
  // The definition of the PodspecEdDSAPubKey.
  PodspecEdDSAPubKeyDef,
  // The type of the value that the PodspecEdDSAPubKey outputs.
  PODEdDSAPublicKeyValue,
  // The type of the value that the PodspecEdDSAPubKey accepts (including coercion).
  PODEdDSAPublicKeyValue | string
> {
  public list(
    list: string[],
    options: { exclude: boolean } = { exclude: false }
  ): PodspecEdDSAPubKey {
    return new PodspecEdDSAPubKey({
      ...this.def,
      checks: [
        ...this.def.checks,
        { kind: "list", list, exclude: options.exclude }
      ]
    });
  }

  /**
   * Parses the given data into a PODEdDSAPublicKeyValue.
   * @param data - The data to parse.
   * @param params - The parse parameters.
   * @returns The parsed PODEdDSAPublicKeyValue, or an issue if the data is invalid.
   */
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

  /**
   * Creates a new PodspecEdDSAPubKey.
   *
   * See {@link CreateArgs} for more details.
   *
   * @param args - The creation arguments.
   * @returns The created PodspecEdDSAPubKey.
   */
  static create(args?: CreateArgs<EdDSAPubKeyCheck>): PodspecEdDSAPubKey {
    return new PodspecEdDSAPubKey({
      type: PodspecDataType.EdDSAPubKey,
      coerce: args?.coerce ?? false,
      checks: args?.checks ?? []
    });
  }

  /**
   * Serializes the PodspecEdDSAPubKey into a PodspecEdDSAPubKeyDef.
   * The result is a cloneable object, but may not be safe to serialize to
   * JSON due to the presence of bigint values.
   *
   * @returns The serialized PodspecEdDSAPubKeyDef.
   */
  public serialize(): PodspecEdDSAPubKeyDef {
    return {
      type: PodspecDataType.EdDSAPubKey,
      coerce: this.def.coerce,
      checks: structuredClone(this.def.checks)
    };
  }
}
