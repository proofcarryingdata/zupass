import * as v from "valibot";
import { GPCProofObjectConfig } from "../gpcTypes";
import * as ValibotPODName from "./podName";
import * as ValibotProofEntryConfig from "./proofEntryConfig";
import * as ValibotProofEntryConfigCommon from "./proofEntryConfigCommon";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.strictObject({
    entries: v.record(
      ValibotPODName.Schema.ToJSON,
      ValibotProofEntryConfig.Schema.ToJSON
    ),

    contentID: v.optional(ValibotProofEntryConfigCommon.Schema.ToJSON),
    signerPublicKey: v.optional(ValibotProofEntryConfigCommon.Schema.ToJSON)
  }),
  FromJSON: v.strictObject({
    entries: v.record(
      ValibotPODName.Schema.FromJSON,
      ValibotProofEntryConfig.Schema.FromJSON
    ),

    contentID: v.optional(ValibotProofEntryConfigCommon.Schema.FromJSON),
    signerPublicKey: v.optional(ValibotProofEntryConfigCommon.Schema.FromJSON)
  })
};

export type TSType = GPCProofObjectConfig;
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
