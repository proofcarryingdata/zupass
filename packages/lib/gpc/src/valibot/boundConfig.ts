import * as v from "valibot";
import { GPCBoundConfig } from "../gpcTypes";
import * as ValibotCircuitIdentifier from "./circuitIdentifier";
import * as ValibotProofConfig from "./proofConfig";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.strictObject({
    ...ValibotProofConfig.Schema.ToJSON.entries,
    circuitIdentifier: ValibotCircuitIdentifier.Schema.ToJSON
  }),
  FromJSON: v.strictObject({
    ...ValibotProofConfig.Schema.FromJSON.entries,
    circuitIdentifier: ValibotCircuitIdentifier.Schema.FromJSON
  })
};

export type TSType = GPCBoundConfig;
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
