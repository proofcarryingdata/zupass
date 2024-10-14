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
import { PODMembershipLists } from "./gpcTypes";
import type {
  InferredJSONClosedInterval,
  InferredJSONProofEntryBoundsCheckConfig
} from "./gpcValibot";

// TODO(artwyman): Decide how many of the types and converters to expose.
// Potentially only those for the top-level types: GPCProofConfig,
// GPCBoundConfig, GPCRevealedClaims.

/**
 * JSON-compatible type for representing {@link ClosedInterval}, which is
 * safe to serialize directly using `JSON.stringify`.
 *
 * This is identical to the TypeScript type except that `bigint` and
 * {@link PODValue} elements are replaced by JSON-compatible representations.
 *
 * Use {@link gpcClosedIntervalToJSON}
 */
export type JSONClosedInterval = InferredJSONClosedInterval;

/**
 * JSON-compatible type for representing {@link GPCProofEntryBoundsCheckConfig},
 * which is safe to serialize directly using `JSON.stringify`.
 *
 * This is identical to the TypeScript type except that `bigint` and
 * {@link PODValue} elements are replaced by JSON-compatible representations.
 */
export type JSONProofEntryBoundsCheckConfig =
  InferredJSONProofEntryBoundsCheckConfig;

/**
 * JSON-compatible format for representing a {@link PODMembershipLists}
 * structure.  The structure is the same as PODMembershipLists except that
 * each individual value should be JSON formated using {@link podValueToJSON}.
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
