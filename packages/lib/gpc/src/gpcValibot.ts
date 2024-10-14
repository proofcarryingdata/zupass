import { bigintFromJSON, bigintToSimplestJSON } from "@pcd/pod";
import * as v from "valibot";
import { ClosedInterval, GPCProofEntryBoundsCheckConfig } from "./gpcTypes";

/**
 * Helper for Valibot parsing which throws TypeError instead of ValiError, and
 * produces a more informative message.
 *
 * @param schema Valibot schema
 * @param input input to parse
 * @returns the parser output
 * @throws TypeError if the parser indicates invalid input
 */
export function valibotParse<
  const TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
>(schema: TSchema, input: unknown): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, input);
  if (!result.success) {
    console.log(result.issues);
    console.log(v.getDotPath(result.issues[0]));
    const issue = result.issues[0];
    const dotPath = v.getDotPath(result.issues[0]);
    throw new TypeError(
      `Invalid input${!dotPath ? "" : " " + dotPath}: ${issue.message}`
    );
  }
  return result.output;
}

//
// Valibot parsing and types for ClosedInterval to/from JSON.
//

const ClosedIntervalToJSONSchema = v.strictObject({
  min: v.pipe(v.bigint(), v.transform(bigintToSimplestJSON)),
  max: v.pipe(v.bigint(), v.transform(bigintToSimplestJSON))
});
export type InferredJSONClosedInterval = v.InferOutput<
  typeof ClosedIntervalToJSONSchema
>;
const _ClosedIntervervalToJsonInputCheck =
  {} as ClosedInterval satisfies v.InferInput<
    typeof ClosedIntervalToJSONSchema
  >;

export function gpcClosedIntervalToJSON(
  interval: ClosedInterval
): InferredJSONClosedInterval {
  return valibotParse(ClosedIntervalToJSONSchema, interval);
}

const ClosedIntervalFromJSONSchema = v.strictObject({
  min: v.pipe(v.union([v.string(), v.number()]), v.transform(bigintFromJSON)),
  max: v.pipe(v.union([v.string(), v.number()]), v.transform(bigintFromJSON))
});
const _ClosedIntervervalFromJsonOutputCheck =
  {} as ClosedInterval satisfies v.InferOutput<
    typeof ClosedIntervalFromJSONSchema
  >;
const _ClosedIntervervalFromJsonInputCheck =
  {} as InferredJSONClosedInterval satisfies v.InferInput<
    typeof ClosedIntervalFromJSONSchema
  >;

export function gpcClosedIntervalFromJSON(
  jsonInterval: InferredJSONClosedInterval
): ClosedInterval {
  return valibotParse(ClosedIntervalFromJSONSchema, jsonInterval);
}

//
// Valibot parsing and types for GPCProofEntryBoundsCheckConfig to/from JSON.
//

const ProofEntryBoundsCheckConfigToJSONSchema = v.strictObject({
  inRange: v.optional(ClosedIntervalToJSONSchema),
  notInRange: v.optional(ClosedIntervalToJSONSchema)
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
  inRange: v.optional(ClosedIntervalFromJSONSchema),
  notInRange: v.optional(ClosedIntervalFromJSONSchema)
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
