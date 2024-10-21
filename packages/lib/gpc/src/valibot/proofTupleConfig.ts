import * as v from "valibot";
import { GPCProofTupleConfig } from "../gpcTypes";
import * as ValibotPODEntryIdentifier from "./podEntryIdentifier";
import * as ValibotPODName from "./podName";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.strictObject({
    entries: v.array(ValibotPODEntryIdentifier.Schema.ToJSON),
    isMemberOf: v.optional(ValibotPODName.Schema.ToJSON),
    isNotMemberOf: v.optional(ValibotPODName.Schema.ToJSON)
  }),
  FromJSON: v.strictObject({
    entries: v.array(ValibotPODEntryIdentifier.Schema.FromJSON),
    isMemberOf: v.optional(ValibotPODName.Schema.FromJSON),
    isNotMemberOf: v.optional(ValibotPODName.Schema.FromJSON)
  })
};

export type TSType = GPCProofTupleConfig;
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
