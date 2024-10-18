import { JSONPODValue, JSONPODValueTuple, PODName } from "@pcd/pod";
import {
  checkBoundConfig,
  checkProofConfig,
  checkRevealedClaims
} from "./gpcChecks";
import {
  GPCBoundConfig,
  GPCProofConfig,
  GPCRevealedClaims,
  PODMembershipLists
} from "./gpcTypes";
import {
  ValibotBoundConfig,
  ValibotMembershipLists,
  ValibotProofConfig,
  ValibotRevealedClaims
} from "./gpcValibot";

/**
 * JSON-compatible type for representing {@link GPCProofConfig}, which is
 * safe to serialize directly using `JSON.stringify`.
 *
 * This is identical to the TypeScript type except that `bigint` and
 * {@link PODValue} elements are replaced by JSON-compatible representations
 * defined by {@link JSONBigInt} and {@link JSONPODValue} respectively.
 *
 * Use {@link proofConfigToJSON} and {@link proofConfigFromJSON} to convert
 * between JSON and TypeScript represenations.
 */
export type JSONProofConfig = ValibotProofConfig.JSONType;

/**
 * Converts a {@link GPCProofConfig} to a JSON-compatible representation which
 * can be serialized directly using `JSON.stringify`.  See
 * {@link JSONProofConfig} for information about the format.
 *
 * @param config the config object to convert
 * @returns a JSON representation
 * @throws if the config is invalid
 */
export function proofConfigToJSON(config: GPCProofConfig): JSONProofConfig {
  checkProofConfig(config);
  return ValibotProofConfig.toJSON(config);
}

/**
 * Parses a {@link GPCProofConfig} from a JSON-compatible representation,
 * potentially received directly from `JSON.parse`.  See {@link JSONProofConfig}
 * for information about the format.
 *
 * @param config the JSON representation
 * @returns a config object
 * @throws if the config is invalid
 */
export function proofConfigFromJSON(
  jsonConfig: JSONProofConfig
): GPCProofConfig {
  const config = ValibotProofConfig.fromJSON(jsonConfig);
  checkProofConfig(config);
  return config;
}

/**
 * JSON-compatible type for representing {@link GPCBoundConfig}, which is
 * safe to serialize directly using `JSON.stringify`.
 *
 * This is identical to the TypeScript type except that `bigint` and
 * {@link PODValue} elements are replaced by JSON-compatible representations
 * defined by {@link JSONBigInt} and {@link JSONPODValue} respectively.
 *
 * Use {@link boundConfigToJSON} and {@link boundConfigFromJSON} to convert
 * between JSON and TypeScript represenations.
 */
export type JSONBoundConfig = ValibotBoundConfig.JSONType;

/**
 * Converts a {@link GPCProofConfig} to a JSON-compatible representation which
 * can be serialized directly using `JSON.stringify`.  See
 * {@link JSONProofConfig} for information about the format.
 *
 * @param config the config object to convert
 * @returns a JSON representation
 * @throws if the config is invalid
 */
export function boundConfigToJSON(config: GPCBoundConfig): JSONBoundConfig {
  checkBoundConfig(config);
  return ValibotBoundConfig.toJSON(config);
}

/**
 * Parses a {@link GPCProofConfig} from a JSON-compatible representation,
 * potentially received directly from `JSON.parse`.  See {@link JSONProofConfig}
 * for information about the format.
 *
 * @param config the JSON representation
 * @returns a config object
 * @throws if the config is invalid
 */
export function boundConfigFromJSON(
  jsonConfig: JSONBoundConfig
): GPCBoundConfig {
  const config = ValibotBoundConfig.fromJSON(jsonConfig);
  checkBoundConfig(config);
  return config;
}

/**
 * JSON-compatible type for representing {@link GPCRevealedClaims}, which is
 * safe to serialize directly using `JSON.stringify`.
 *
 * This is identical to the TypeScript type except that `bigint` and
 * {@link PODValue} elements are replaced by JSON-compatible representations
 * defined by {@link JSONBigInt} and {@link JSONPODValue} respectively.
 *
 * Use {@link boundConfigToJSON} and {@link boundConfigFromJSON} to convert
 * between JSON and TypeScript represenations.
 */
export type JSONRevealedClaims = ValibotRevealedClaims.JSONType;

/**
 * Converts a {@link GPCRevealedClaims} to a JSON-compatible representation
 * which can be serialized directly using `JSON.stringify`.  See
 * {@link JSONRevealedClaims} for information about the format.
 *
 * @param config the config object to convert
 * @returns a JSON representation
 * @throws if the config is invalid
 */
export function revealedClaimsToJSON(
  claims: GPCRevealedClaims
): JSONRevealedClaims {
  checkRevealedClaims(claims);
  return ValibotRevealedClaims.toJSON(claims);
}

/**
 * Parses a {@link GPCRevealedClaims} from a JSON-compatible representation,
 * potentially received directly from `JSON.parse`.  See
 * {@link JSONRevealedClaims} for information about the format.
 *
 * @param config the JSON representation
 * @returns a config object
 * @throws if the config is invalid
 */
export function revealedClaimsFromJSON(
  jsonClaims: JSONRevealedClaims
): GPCRevealedClaims {
  const claims = ValibotRevealedClaims.fromJSON(jsonClaims);
  checkRevealedClaims(claims);
  return claims;
}

/**
 * JSON-compatible format for representing a {@link PODMembershipLists}
 * structure.  The structure is the same as PODMembershipLists except that
 * each individual value should be JSON formated as defined by
 * {@link JSONPODValue}.
 */
export type JSONPODMembershipLists = Record<
  PODName,
  JSONPODValue[] | JSONPODValueTuple[]
>;

/**
 * Parses {@link PODMembershipLists} from the JSON-compatible format,
 * potentially received directly from `JSON.parse`.  The format for values is
 * as described by {@link JSONPODValue}, and the additional objects/arrays
 * containing the values are standard JSON.
 *
 * @param jsonMembershipLists a JSON-compatible representation of
 *   `PODMembershipLists`
 * @returns `PODMembershipLists` parsed from JSON
 * @throws if the serialized form is invalid
 */
export function podMembershipListsFromJSON(
  jsonMembershipLists: JSONPODMembershipLists
): PODMembershipLists {
  return ValibotMembershipLists.fromJSON(jsonMembershipLists);
}

/**
 * Converts {@link PODMembershipLists} to the JSON-compatible format which
 * can be serialized directly via `JSON.stringify`.  The format for values is
 * as described by {@link JSONPODValue}, and the additional objects/arrays
 * containing the values are passed through as pure JSON.
 *
 * @param membershipLists `PODMembershipLists` to convert
 * @returns JSON representation
 * @throws if the serialized form is invalid
 */
export function podMembershipListsToJSON(
  membershipLists: PODMembershipLists
): JSONPODMembershipLists {
  return ValibotMembershipLists.toJSON(membershipLists);
}
