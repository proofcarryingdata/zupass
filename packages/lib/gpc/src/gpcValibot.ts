import * as v from "valibot";
import { GPCProofEntryBoundsCheckConfig } from "./gpcTypes";
import * as ValibotClosedInterval from "./valibot/closedInterval";
import { valibotParse } from "./valibot/valibotUtil";

// TODO(artywman): Example of to declare a new type in a shared file.
// The boiler-plate is less similar due to the need for unique names, but
// the import syntax isn't as unusual.

const ProofEntryBoundsCheckConfigToJSONSchema = v.strictObject({
  inRange: v.optional(ValibotClosedInterval.Schema.ToJSON),
  notInRange: v.optional(ValibotClosedInterval.Schema.ToJSON)
});
export type InferredJSONProofEntryBoundsCheckConfig = v.InferOutput<
  typeof ProofEntryBoundsCheckConfigToJSONSchema
>;
const _ProofEntryBoundsCheckConfigToJSONInputCheck =
  {} as GPCProofEntryBoundsCheckConfig satisfies v.InferInput<
    typeof ProofEntryBoundsCheckConfigToJSONSchema
  >;

export function gpcProofEntryBoundsCheckConfigToJSON(
  config: GPCProofEntryBoundsCheckConfig
): InferredJSONProofEntryBoundsCheckConfig {
  return valibotParse(ProofEntryBoundsCheckConfigToJSONSchema, config);
}

const ProofEntryBoundsCheckConfigFromJSONSchema = v.strictObject({
  inRange: v.optional(ValibotClosedInterval.Schema.FromJSON),
  notInRange: v.optional(ValibotClosedInterval.Schema.FromJSON)
});
const _ProofEntryBoundsCheckConfigFromJSONOutputCheck =
  {} as GPCProofEntryBoundsCheckConfig satisfies v.InferOutput<
    typeof ProofEntryBoundsCheckConfigFromJSONSchema
  >;
const _ProofEntryBoundsCheckConfigFromJSONInputCheck =
  {} as InferredJSONProofEntryBoundsCheckConfig satisfies v.InferInput<
    typeof ProofEntryBoundsCheckConfigFromJSONSchema
  >;

export function gpcProofEntryBoundsCheckConfigFromJSON(
  config: InferredJSONProofEntryBoundsCheckConfig
): GPCProofEntryBoundsCheckConfig {
  return valibotParse(ProofEntryBoundsCheckConfigFromJSONSchema, config);
}
