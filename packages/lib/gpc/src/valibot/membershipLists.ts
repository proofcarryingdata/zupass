import * as v from "valibot";
import { JSONPODMembershipLists } from "../gpcJSON";
import { PODMembershipLists } from "../gpcTypes";
import * as ValibotPODName from "./podName";
import * as ValibotPODValue from "./podValue";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.record(
    ValibotPODName.Schema.ToJSON,
    v.union([
      v.array(ValibotPODValue.Schema.ToJSON),
      v.array(v.array(ValibotPODValue.Schema.ToJSON))
    ])
  ),
  FromJSON: v.record(
    ValibotPODName.Schema.FromJSON,
    v.union([
      v.array(ValibotPODValue.Schema.FromJSON),
      v.array(v.array(ValibotPODValue.Schema.FromJSON))
    ])
  )
};

export type TSType = PODMembershipLists;
export type JSONType = JSONPODMembershipLists;

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
