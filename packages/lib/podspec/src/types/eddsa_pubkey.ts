import { checkPublicKeyFormat, PODEdDSAPublicKeyValue } from "@pcd/pod";
import { PodspecDataType, PodspecDataTypeDef, PodspecValue } from "../base";
import { FAILURE, ParseResult, SUCCESS } from "../parse";
import { CreateArgs } from "../utils";

function isPODEdDSAPublicKeyValue(
  data: unknown
): data is PODEdDSAPublicKeyValue {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data is null or not an object");
  }
  if (!("type" in data && "value" in data)) {
    throw new Error("Data does not have type and value properties");
  }
  if (data.type !== "eddsa_pubkey") {
    throw new Error("PODValue type is not eddsa_pubkey");
  }
  if (typeof data.value !== "string") {
    throw new Error("Data value is not a string");
  }
  return true;
}

export type EdDSAPubKeyCheck = never;

interface PodspecEdDSAPubKeyDef extends PodspecDataTypeDef {
  type: PodspecDataType.EdDSAPubKey;
  coerce: boolean;
  checks: EdDSAPubKeyCheck[];
}

export class PodspecEdDSAPubKey extends PodspecValue<
  PodspecEdDSAPubKeyDef,
  PODEdDSAPublicKeyValue,
  PODEdDSAPublicKeyValue | string
> {
  private dataToValue(data: unknown): PODEdDSAPublicKeyValue {
    try {
      if (isPODEdDSAPublicKeyValue(data)) {
        return data;
      }
    } catch (e) {
      if (this.def.coerce) {
        if (typeof data === "string") {
          return { type: "eddsa_pubkey", value: data };
        }
      } else {
        throw e;
      }
    }
    throw new Error("Data is not a valid POD eddsa_pubkey value");
  }

  _parse(data: unknown): ParseResult<PODEdDSAPublicKeyValue> {
    try {
      const value = this.dataToValue(data);
      checkPublicKeyFormat(value.value);
      return SUCCESS(value);
    } catch (e) {
      this._addError(e as Error);
      return FAILURE;
    }
  }

  static create(args?: CreateArgs<EdDSAPubKeyCheck>): PodspecEdDSAPubKey {
    return new PodspecEdDSAPubKey({
      type: PodspecDataType.EdDSAPubKey,
      coerce: args?.coerce ?? false,
      checks: args?.checks ?? []
    });
  }

  public serialize(): PodspecEdDSAPubKeyDef {
    return {
      type: PodspecDataType.EdDSAPubKey,
      coerce: this.def.coerce,
      checks: structuredClone(this.def.checks)
    };
  }
}
