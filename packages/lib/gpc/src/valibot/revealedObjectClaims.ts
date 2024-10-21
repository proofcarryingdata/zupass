import * as v from "valibot";
import { GPCRevealedObjectClaims } from "../gpcTypes";
import * as ValibotBigInt from "./bigint";
import * as ValibotPODEntries from "./podEntries";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.strictObject({
    entries: v.optional(ValibotPODEntries.Schema.ToJSON),
    contentID: v.optional(ValibotBigInt.Schema.ToJSON),
    signerPublicKey: v.optional(v.string())
  }),
  FromJSON: v.strictObject({
    entries: v.optional(ValibotPODEntries.Schema.FromJSON),
    contentID: v.optional(ValibotBigInt.Schema.FromJSON),
    signerPublicKey: v.optional(v.string())
  })
};

export type TSType = GPCRevealedObjectClaims;
export type JSONType = v.InferOutput<typeof Schema.ToJSON>;

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
