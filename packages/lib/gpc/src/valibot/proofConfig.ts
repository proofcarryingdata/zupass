import * as v from "valibot";
import { GPCProofConfig } from "../gpcTypes";
import * as ValibotCircuitIdentifier from "./circuitIdentifier";
import * as ValibotPODName from "./podName";
import * as ValibotProofObjectConfig from "./proofObjectConfig";
import * as ValibotProofTupleConfig from "./proofTupleConfig";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.strictObject({
    circuitIdentifier: v.optional(ValibotCircuitIdentifier.Schema.ToJSON),
    pods: v.record(
      ValibotPODName.Schema.ToJSON,
      ValibotProofObjectConfig.Schema.ToJSON
    ),
    uniquePODs: v.optional(v.boolean()),
    tuples: v.optional(
      v.record(
        ValibotPODName.Schema.ToJSON,
        ValibotProofTupleConfig.Schema.ToJSON
      )
    )
  }),
  FromJSON: v.strictObject({
    circuitIdentifier: v.optional(ValibotCircuitIdentifier.Schema.FromJSON),
    pods: v.record(
      ValibotPODName.Schema.FromJSON,
      ValibotProofObjectConfig.Schema.FromJSON
    ),
    uniquePODs: v.optional(v.boolean()),
    tuples: v.optional(
      v.record(
        ValibotPODName.Schema.FromJSON,
        ValibotProofTupleConfig.Schema.FromJSON
      )
    )
  })
};

export type TSType = GPCProofConfig;
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
