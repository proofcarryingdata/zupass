import {
  JSONPODValue,
  PODValue,
  podValueFromJSON,
  podValueToJSON
} from "@pcd/pod";
import * as v from "valibot";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.pipe(
    v.variant("type", [
      v.strictObject({
        type: v.literal("string"),
        value: v.string()
      }),
      v.strictObject({
        type: v.literal("bytes"),
        value: v.instance(Uint8Array)
      }),
      v.strictObject({
        type: v.literal("int"),
        value: v.bigint()
      }),
      v.strictObject({
        type: v.literal("cryptographic"),
        value: v.bigint()
      }),
      v.strictObject({
        type: v.literal("boolean"),
        value: v.boolean()
      }),
      v.strictObject({
        type: v.literal("eddsa_pubkey"),
        value: v.string()
      }),
      v.strictObject({
        type: v.literal("date"),
        value: v.date()
      }),
      v.strictObject({
        type: v.literal("null"),
        value: v.null()
      })
    ]),
    v.transform(podValueToJSON)
  ),
  FromJSON: v.pipe(
    v.union([
      v.string(),
      v.number(),
      v.boolean(),
      v.null(),
      v.strictObject({ string: v.string() }),
      v.strictObject({
        bytes: v.pipe(
          v.string(),
          v.base64("Bytes values must be encoded in Base64.")
        )
      }),
      v.strictObject({ int: v.union([v.number(), v.string()]) }),
      v.strictObject({ cryptographic: v.union([v.number(), v.string()]) }),
      v.strictObject({ boolean: v.boolean() }),
      v.strictObject({
        eddsa_pubkey: v.union([
          v.pipe(
            v.string(),
            v.hexadecimal("Public key values must be encoded in Base64 or hex.")
          ),
          v.pipe(
            v.string(),
            v.base64("Public key values must be encoded in Base64 or hex.")
          )
        ])
      }),
      v.strictObject({ date: v.string() }),
      v.strictObject({ null: v.null() })
    ]),
    v.transform(podValueFromJSON)
  )
};

export type TSType = PODValue;
export type JSONType = JSONPODValue;

//
// Don't customize below this point.  This boilerplate is intended to be the
// same for every type, and updated by copy/paste.
//

const _ToJsonOutputCheck = {} as v.InferOutput<
  typeof Schema.ToJSON
> satisfies JSONType;
const _ToJsonInputCheck = {} as TSType satisfies v.InferInput<
  typeof Schema.ToJSON
>;

const _FromJsonOutputCheck = {} as v.InferOutput<
  typeof Schema.FromJSON
> satisfies TSType;
const _FromJsonInputCheck = {} as JSONType satisfies v.InferInput<
  typeof Schema.FromJSON
>;

export function toJSON(gpcInput: TSType): JSONType {
  return valibotParse(Schema.ToJSON, gpcInput);
}

export function fromJSON(jsonInput: JSONType): TSType {
  return valibotParse(Schema.FromJSON, jsonInput);
}
