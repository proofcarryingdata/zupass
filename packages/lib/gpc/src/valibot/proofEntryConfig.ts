import * as v from "valibot";
import { GPCProofEntryConfig, SEMAPHORE_V3, SEMAPHORE_V4 } from "../gpcTypes";
import * as ValibotClosedInterval from "./closedInterval";
import * as ValibotPODEntryIdentifier from "./podEntryIdentifier";
import * as ValibotProofEntryConfigCommon from "./proofEntryConfigCommon";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.strictObject({
    ...ValibotProofEntryConfigCommon.Schema.ToJSON.entries,
    isOwnerID: v.optional(v.picklist([SEMAPHORE_V3, SEMAPHORE_V4])),
    inRange: v.optional(ValibotClosedInterval.Schema.ToJSON),
    notInRange: v.optional(ValibotClosedInterval.Schema.ToJSON),

    // TODO(POD-P4): Can Valibot express the oneof nature of these?
    lessThan: v.optional(ValibotPODEntryIdentifier.Schema.ToJSON),
    lessThanEq: v.optional(ValibotPODEntryIdentifier.Schema.ToJSON),
    greaterThan: v.optional(ValibotPODEntryIdentifier.Schema.ToJSON),
    greaterThanEq: v.optional(ValibotPODEntryIdentifier.Schema.ToJSON)
  }),
  FromJSON: v.strictObject({
    ...ValibotProofEntryConfigCommon.Schema.FromJSON.entries,
    isOwnerID: v.optional(v.picklist([SEMAPHORE_V3, SEMAPHORE_V4])),

    inRange: v.optional(ValibotClosedInterval.Schema.FromJSON),
    notInRange: v.optional(ValibotClosedInterval.Schema.FromJSON),

    // TODO(POD-P4): Can Valibot express the oneof nature of these?
    lessThan: v.optional(ValibotPODEntryIdentifier.Schema.FromJSON),
    lessThanEq: v.optional(ValibotPODEntryIdentifier.Schema.FromJSON),
    greaterThan: v.optional(ValibotPODEntryIdentifier.Schema.FromJSON),
    greaterThanEq: v.optional(ValibotPODEntryIdentifier.Schema.FromJSON)
  })
};

export type TSType = GPCProofEntryConfig;
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
