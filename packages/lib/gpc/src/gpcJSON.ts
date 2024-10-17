import {
  checkPODName,
  JSONPODValue,
  JSONPODValueTuple,
  PODName,
  PODValue,
  podValueFromJSON,
  podValueToJSON,
  PODValueTuple,
  requireType
} from "@pcd/pod";
import { checkBoundConfig, checkProofConfig } from "./gpcChecks";
import { GPCBoundConfig, GPCProofConfig, PODMembershipLists } from "./gpcTypes";
import * as ValibotBoundConfig from "./valibot/boundConfig";
import * as ValibotProofConfig from "./valibot/proofConfig";

// TODO(artwyman): Decide how many of the types and converters to expose.
// Potentially only those for the top-level types: GPCProofConfig,
// GPCBoundConfig, GPCRevealedClaims.

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

// TODO(artwyman): JSONRevealedClaims
// TODO(artwyman): JSONProofInputs?
// TODO(artwyman): Convert the below into Valibot as part of GPCProofInputs

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
  requireType("jsonMembershipLists", jsonMembershipLists, "object");
  const resultLists: PODMembershipLists = {};
  for (const [listName, list] of Object.entries(jsonMembershipLists)) {
    checkPODName(listName);
    requireType(listName, list, "array");
    if (list.length === 0) {
      resultLists[listName] = [];
    } else if (!Array.isArray(list[0])) {
      // List of PODValues.  podValueFromJSON does all the validation.
      resultLists[listName] = list.map((jsonValue) =>
        podValueFromJSON(jsonValue as JSONPODValue)
      );
    } else {
      // List of PODValueTuples.
      resultLists[listName] = list.map((jsonTuple) => {
        requireType("jsonTuple", jsonTuple, "array");
        // podValueFromJSON does the remaining validation.
        return (jsonTuple as JSONPODValueTuple).map((jsonValue) =>
          podValueFromJSON(jsonValue as JSONPODValue)
        );
      });
    }
  }
  return resultLists;
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
  requireType("membershipLists", membershipLists, "object");
  const resultLists: JSONPODMembershipLists = {};
  for (const [listName, list] of Object.entries(membershipLists)) {
    checkPODName(listName);
    requireType(listName, list, "array");
    if (list.length === 0) {
      resultLists[listName] = [];
    } else if (!Array.isArray(list[0])) {
      // List of PODValues.  podValueFromJSON does all the validation.
      resultLists[listName] = list.map((value) =>
        podValueToJSON(value as PODValue)
      );
    } else {
      // List of PODValueTuples.
      resultLists[listName] = list.map((tuple) => {
        requireType("tuple", tuple, "array");
        // podValueFromJSON does the remaining validation.
        return (tuple as PODValueTuple).map((value) =>
          podValueToJSON(value as PODValue)
        );
      });
    }
  }
  return resultLists;
}

// TODO(POD-P1): Finish gpcJSON for GPC config/inputs/outputs.  So far it
// only covers use cases covered by POD values contained in simple JSON
// containers.
