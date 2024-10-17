import * as v from "valibot";
import { GPCRevealedClaims } from "../gpcTypes";
import * as ValibotBigInt from "./bigint";
import * as ValibotMembershipLists from "./membershipLists";
import * as ValibotPODName from "./podName";
import * as ValibotPODValue from "./podValue";
import * as ValibotRevealedObjectClaims from "./revealedObjectClaims";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.strictObject({
    pods: v.record(
      ValibotPODName.Schema.ToJSON,
      ValibotRevealedObjectClaims.Schema.ToJSON
    ),
    owner: v.optional(
      v.strictObject({
        externalNullifier: ValibotPODValue.Schema.ToJSON,
        nullifierHashV3: v.optional(ValibotBigInt.Schema.ToJSON),
        nullifierHashV4: v.optional(ValibotBigInt.Schema.ToJSON)
      })
    ),
    membershipLists: v.optional(ValibotMembershipLists.Schema.ToJSON),
    watermark: v.optional(ValibotPODValue.Schema.ToJSON)
  }),
  FromJSON: v.strictObject({
    pods: v.record(
      ValibotPODName.Schema.FromJSON,
      ValibotRevealedObjectClaims.Schema.FromJSON
    ),
    owner: v.optional(
      v.strictObject({
        externalNullifier: ValibotPODValue.Schema.FromJSON,
        nullifierHashV3: v.optional(ValibotBigInt.Schema.FromJSON),
        nullifierHashV4: v.optional(ValibotBigInt.Schema.FromJSON)
      })
    ),
    membershipLists: v.optional(ValibotMembershipLists.Schema.FromJSON),
    watermark: v.optional(ValibotPODValue.Schema.FromJSON)
  })
};

export type TSType = GPCRevealedClaims;
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
