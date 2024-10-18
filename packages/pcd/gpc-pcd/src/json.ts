import {
  checkPODName,
  podEntriesFromJSON,
  podEntriesToJSON,
  requireType
} from "@pcd/pod";
import { FixedPODEntries, JSONFixedPODEntries } from "./GPCPCD";

/**
 * Parses {@link FixedPODEntries} from the JSON-compatible format, potentially
 * received directly from `JSON.parse`.
 *
 * @param jsonFixedPODEntries a JSON-compatible representation of
 *   `FixedPODEntries`
 * @returns `FixedPODEntries` parsed from JSON
 * @throws if the serialized form is invalid
 */
export function fixedPODEntriesFromJSON(
  jsonFixedPODEntries: JSONFixedPODEntries
): FixedPODEntries {
  requireType("jsonFixedPODEntries", jsonFixedPODEntries, "object");
  return Object.fromEntries(
    Object.entries(jsonFixedPODEntries).map(([podName, entries]) => [
      checkPODName(podName),
      podEntriesFromJSON(entries)
    ])
  );
}

/**
 * Converts {@link FixedPODEntries} to a JSON-compatible format which can be
 * safely serialized using `JSON.stringify`.
 *
 * @param fixedPODEntries the prescribed values to serialize
 * @param space pretty-printing configuration, as defined by the corresponding
 *   argument to JSON.stringify.
 * @returns a string representation
 */
export function fixedPODEntriesToJSON(
  fixedPODEntries: FixedPODEntries
): JSONFixedPODEntries {
  requireType("fixedPODEntries", fixedPODEntries, "object");
  return Object.fromEntries(
    Object.entries(fixedPODEntries).map(([podName, jsonEntries]) => [
      checkPODName(podName),
      podEntriesToJSON(jsonEntries)
    ])
  );
}
