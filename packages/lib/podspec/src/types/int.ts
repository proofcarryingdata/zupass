import {
  checkBigintBounds,
  POD_INT_MAX,
  POD_INT_MIN,
  PODIntValue
} from "@pcd/pod";
import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import { FAILURE, ParseResult, SUCCESS } from "../parse";
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
    throw new Error("Data is null or not an object");
  }
  if (!("type" in data && "value" in data)) {
    throw new Error("Data does not have type and value properties");
  }
  if (data.type !== "int") {
    throw new Error("PODValue type is not int");
  }
  if (typeof data.value !== "bigint") {
    throw new Error("Data value is not a bigint");
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
  private dataToValue(data: unknown): PODIntValue {
    try {
      if (isPODIntValue(data)) {
        return data;
      }
    } catch (e) {
      // If coercion is allowed, we can try to convert some types to PODIntValue
      if (this.def.coerce) {
        if (typeof data === "bigint") {
          checkBigintBounds("", data, POD_INT_MIN, POD_INT_MAX);
          return { type: "int", value: data };
        }
        if (typeof data === "number") {
          const bigIntValue = BigInt(data);
          checkBigintBounds("", bigIntValue, POD_INT_MIN, POD_INT_MAX);
          return { type: "int", value: bigIntValue };
        }
      } else {
        throw e;
      }
    }
    throw new Error("Data is not a valid POD integer value");
  }

  _parse(data: unknown): ParseResult<PODIntValue> {
    try {
      const value = this.dataToValue(data);

      for (const check of this.def.checks) {
        if (check.kind === "range") {
          if (value.value < check.min || value.value > check.max) {
            throw new Error("Value out of range");
          }
        } else if (check.kind === "list") {
          const included = check.list.includes(value.value);
          if (!included && !check.exclude) {
            throw new Error("Value not in allowed list");
          }
          if (included && check.exclude) {
            throw new Error("Value in excluded list");
          }
        } else {
          assertUnreachable(check);
        }
      }

      return SUCCESS(value);
    } catch (e) {
      this._addError(e as Error);
      return FAILURE;
    }
  }

  public list(list: bigint[], exclude = false): typeof this {
    this.def.checks.push({
      kind: "list",
      list,
      exclude
    });
    return this;
  }

  public inRange(min: bigint, max: bigint): typeof this {
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
