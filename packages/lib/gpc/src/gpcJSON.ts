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
