import { PODName, PODRawValue, PODValue, podValueFromRawValue } from "@pcd/pod";
import JSONBig from "json-bigint";

export function revealedEntriesFromSimplifiedJSON(
  simplifiedJSON: string
): Record<PODName, Record<PODName, PODValue>> {
  // Deserialise and check type(s).
  const revealedRawEntries = JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).parse(simplifiedJSON) as Record<PODName, Record<PODName, PODRawValue>>;

  if (
    // Deserialised JSON should be a record
    typeof revealedRawEntries !== "object" ||
    // ...and its entries should be records
    Object.values(revealedRawEntries).some(
      (value) => typeof value !== "object"
    ) ||
    // ...and the entries of those records should be raw values.
    Object.values(revealedRawEntries)
      .flatMap((entryRecord) => Object.values(entryRecord))
      .some((value) => typeof value !== "string" || typeof value !== "bigint")
  ) {
    throw new TypeError("Invalid serialised revealed entries.");
  }

  // Convert raw values to POD values
  return Object.fromEntries(
    Object.entries(revealedRawEntries).map(([podName, entryRecord]) => [
      podName,
      Object.fromEntries(
        Object.entries(entryRecord).map(([entryName, rawValue]) => [
          entryName,
          podValueFromRawValue(rawValue)
        ])
      )
    ])
  );
}
