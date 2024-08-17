import { PODStringValue } from "@pcd/pod";
import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import { FAILURE, ParseResult, SUCCESS } from "../parse";
import { assertUnreachable, CreateArgs } from "../utils";

/**
 * Checks if the given data has the correct shape for a POD string value.
 *
 * @param data - The data to check
 * @returns True if the data has the correct shape for a POD string value
 */
function isPODStringValue(data: unknown): data is PODStringValue {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data is null or not an object");
  }
  if (!("type" in data && "value" in data)) {
    throw new Error("Data does not have type and value properties");
  }
  if (data.type !== "string") {
    throw new Error("PODValue type is not string");
  }
  if (typeof data.value !== "string") {
    throw new Error("Data value is not a string");
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

  private dataToValue(data: unknown): PODStringValue {
    try {
      if (isPODStringValue(data)) {
        return data;
      }
    } catch (e) {
      if (this.def.coerce) {
        if (typeof data === "string") {
          return { type: "string", value: data };
        }
      } else {
        throw e;
      }
    }
    throw new Error("Data is not a valid POD string value");
  }

  _parse(data: unknown): ParseResult<PODStringValue> {
    try {
      const value = this.dataToValue(data);
      for (const check of this.def.checks) {
        if (check.kind === "list") {
          const included = check.list.includes(value.value);
          if (!included && !check.exclude) {
            throw new Error("Value not in allowed list");
          }
          if (included && check.exclude) {
            throw new Error("Value in excluded list");
          }
        } else {
          assertUnreachable(check.kind);
        }
      }
      return SUCCESS(value);
    } catch (e) {
      this._addError(e as Error);
      return FAILURE;
    }
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
