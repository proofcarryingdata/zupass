import {
  PODName,
  PODRawValue,
  POD_NAME_REGEX,
  podValueFromRawValue,
  podValueToRawValue
} from "@pcd/pod";
import JSONBig from "json-bigint";
import { FixedPODEntries } from "./GPCPCD";

const jsonBigSerializer = JSONBig({
  useNativeBigInt: true,
  alwaysParseAsBig: true
});

/**
 * Deserializes `FixedPODEntries` from the simplified format produced by {@link
 * podEntryRecordToSimplifiedJSON}.  Type information is inferred from the
 * values in a way which should preserve hashing and circuit behavior, but isn't
 * guaranteed to be identical to the types before serialization.  For instance,
 * small numbers are always annotated as `int`, rather than `cryptographic`.
 *
 * @param simplifiedJSON a string representation of `FixedPODEntries`
 * @returns `FixedPODEntries` deserialized from the string
 * @throws if the serialized form is invalid
 */
export function fixedPODEntriesFromSimplifiedJSON(
  simplifiedJSON: string
): FixedPODEntries {
  const simplifiedValues = jsonBigSerializer.parse(simplifiedJSON) as Record<
    PODName,
    Record<PODName, PODRawValue>
  >;

  // Check shape of deserialised string.
  if (
    !(
      // It is a record whose keys are of the right form.
      (
        typeof simplifiedValues === "object" &&
        Object.keys(simplifiedValues).every(
          (key) => key.match(POD_NAME_REGEX) !== null
        ) &&
        // For each of its values,
        Object.values(simplifiedValues).every(
          (entries) =>
            // we should be dealing with a non-trivial record mapping POD names
            // to raw POD values.
            typeof entries === "object" &&
            Object.keys(entries).length > 0 &&
            Object.keys(entries).every(
              (key) =>
                typeof key === "string" && key.match(POD_NAME_REGEX) !== null
            ) &&
            Object.values(entries).every((value) =>
              ["bigint", "string"].includes(typeof value)
            )
        )
      )
    )
  ) {
    throw new TypeError(
      `Invalid serialised FixedPODEntries: ${simplifiedJSON}`
    );
  }

  const entryRecord: FixedPODEntries = Object.fromEntries(
    Object.entries(simplifiedValues).map(([podName, data]) => [
      podName,
      Object.fromEntries(
        Object.entries(data).map(([entryName, value]) => [
          entryName,
          podValueFromRawValue(value)
        ])
      )
    ])
  );

  return entryRecord;
}

/**
 * Serializes `FixedPODEntries` to a string in a simplified format optimized for
 * compactness and human readability.  Calling {@link
 * podEntryRecordFromSimplifiedJSON} will reconstruct `FixedPODEntries` whose POD
 * values will contain the same values and behave the same in hashing and
 * circuits, but the type information may not be identical.
 *
 * @param toSerialize the prescribed values to serialize
 * @param space pretty-printing configuration, as defined by the corresponding
 *   argument to JSON.stringify.
 * @returns a string representation
 */
export function fixedPODEntriesToSimplifiedJSON(
  toSerialize: FixedPODEntries,
  space?: number
): string {
  const simplifiedEntryRecord: Record<
    PODName,
    Record<PODName, PODRawValue>
  > = Object.fromEntries(
    Object.entries(toSerialize).map(([podName, data]) => [
      podName,
      Object.fromEntries(
        Object.entries(data).map(([entryName, value]) => [
          entryName,
          podValueToRawValue(value)
        ])
      )
    ])
  );
  return jsonBigSerializer.stringify(simplifiedEntryRecord, null, space);
}
