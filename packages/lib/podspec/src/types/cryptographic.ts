import {
  checkBigintBounds,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  PODCryptographicValue,
  PODIntValue
} from "@pcd/pod";
import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import { FAILURE, ParseResult, SUCCESS } from "../parse";
import { CreateArgs } from "../utils";

function isPODCryptographicValue(data: unknown): data is PODCryptographicValue {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data is null or not an object");
  }
  if (!("type" in data && "value" in data)) {
    throw new Error("Data does not have type and value properties");
  }
  if (data.type !== "cryptographic") {
    throw new Error("PODValue type is not cryptographic");
  }
  if (typeof data.value !== "bigint") {
    throw new Error("Data value is not a bigint");
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
  private dataToValue(data: unknown): PODCryptographicValue {
    try {
      if (isPODCryptographicValue(data)) {
        return data;
      }
    } catch (e) {
      // If coercion is allowed, we can try to convert some types to PODCryptographicValue
      if (this.def.coerce) {
        if (typeof data === "number") {
          return { type: "cryptographic", value: BigInt(data) };
        }
        if (typeof data === "bigint") {
          return { type: "cryptographic", value: data };
        }
      } else {
        throw e;
      }
    }
    throw new Error("Data is not a valid POD cryptographic value");
  }

  _parse(data: unknown): ParseResult<PODCryptographicValue> {
    try {
      const value = this.dataToValue(data);
      checkBigintBounds(
        "",
        value.value,
        POD_CRYPTOGRAPHIC_MIN,
        POD_CRYPTOGRAPHIC_MAX
      );
      return SUCCESS(value);
    } catch (e) {
      this._addError(e as Error);
      return FAILURE;
    }
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
