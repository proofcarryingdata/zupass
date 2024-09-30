import JSONBig from "json-bigint";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  POD_INT_MAX,
  POD_STRING_TYPE_REGEX,
  PODEntries,
  PODRawValue,
  PODRawValueTuple,
  PODValue,
  PODValueTuple
} from "./podTypes";
import { applyOrMap, checkStringEncodedValueType } from "./podUtil";

/**
 * Serializes `PODEntries` to a string in a full-fidelity format.  Calling
 * {@link deserializePODEntries} will reconstruct the same `PODEntries`
 * including their type information.
 *
 * @param entries the entries to serialize
 * @param space pretty-printing configuration, as defined by the corresponding
 *   argument to JSON.stringify.
 * @returns a string representation
 */
export function serializePODEntries(
  entries: PODEntries,
  space?: number
): string {
  return JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).stringify(entries, null, space);
}

/**
 * Deserializes `PODEntries` from the full-fidelity format produced by
 * {@link serializePODEntries}.
 *
 * @param serializedEntries a string representation of `PODEntries`
 * @returns `PODEntries` deserialized from the string
 * @throws if the serialized form is invalid
 */
export function deserializePODEntries(serializedEntries: string): PODEntries {
  return JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).parse(serializedEntries);
}

/**
 * Maps a `PODValue` to a raw value for use in simplified JSON
 * serialisations, which currently amounts to discarding its
 * type information. See {@link podEntriesToSimplifiedJSON}.
 *
 * @param podValue the POD value to serialize
 * @returns the underlying value
 */
export function podValueToRawValue(podValue: PODValue): PODRawValue {
  if (podValue.type === EDDSA_PUBKEY_TYPE_STRING) {
    return `pod_${EDDSA_PUBKEY_TYPE_STRING}:${podValue.value}`;
  } else if (
    podValue.type === "string" &&
    podValue.value.match(POD_STRING_TYPE_REGEX)
  ) {
    return `pod_string:${podValue.value}`;
  } else {
    return podValue.value;
  }
}

/**
 * Maps a `PODValue` or `PODValueTuple` to a `PODRawValue` or `PODRawValueTuple`
 * for use in simplified JSON serializations.
 *
 * @param podValue the POD value to serialize
 * @returns the underlying value
 */
export function podValueOrTupleToRawValue(
  podValue: PODValue | PODValueTuple
): PODRawValue | PODRawValueTuple {
  return applyOrMap(podValueToRawValue, podValue);
}

/**
 * Serializes `PODEntries` to a string in a simplified format optimized for
 * compactness and human readability.  The simplified format discards type
 * information.  Calling {@link podEntriesFromSimplifiedJSON} will construct
 * `PODEntries` containing the same values, which will behave the same
 * in hashing and circuits, but the type information may not be identical.
 *
 * @param entries the entries to serialize
 * @param space pretty-printing configuration, as defined by the corresponding
 *   argument to JSON.stringify.
 * @returns a string representation
 */
export function podEntriesToSimplifiedJSON(
  entries: PODEntries,
  space?: number
): string {
  const simplified: Record<string, PODRawValue> = {};
  for (const [name, value] of Object.entries(entries)) {
    simplified[name] = podValueToRawValue(value);
  }
  return JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).stringify(simplified, null, space);
}

/**
 * Deserializes `PODValue` from the 'raw value' produced by
 * {@link podValueToRawValue}.  Type information is inferred from the values
 * in a way which should preserve hashing and circuit behavior, but isn't
 * guaranteed to be identical to the types before serialization.  For instance,
 * small numbers are always annotated as `int`, rather than `cryptographic`.
 *
 * @param rawValue a string or bigint representation of `PODValue`
 * @returns `PODValue` deserialized from the aforementioned value
 * @throws if the serialized form is invalid
 */
export function podValueFromRawValue(rawValue: PODRawValue): PODValue {
  switch (typeof rawValue) {
    case "bigint":
      if (rawValue > POD_INT_MAX) {
        return { type: "cryptographic", value: rawValue };
      } else {
        return { type: "int", value: rawValue };
      }
    case "string":
      // Check for a valid prefix. This is required to distinguish between EdDSA
      // public keys and strings. If there is no (valid) prefix, we assume an
      // encoded string.
      const regexpMatch = rawValue.match(POD_STRING_TYPE_REGEX);
      if (regexpMatch !== null) {
        const prefix = checkStringEncodedValueType(rawValue, regexpMatch[1]);
        const payload = regexpMatch[2];
        return { type: prefix, value: payload };
      } else {
        return { type: "string", value: rawValue };
      }
    default:
      throw new Error("Invalid serialised POD value in raw value ${rawValue}.");
  }
}

/**
 * Maps a `PODRawValue` or `PODRawValueTuple` to a `PODValue` or `PODValueTuple`
 * for use in deserialization.
 *
 * @param podValue the POD value to serialize
 * @returns the underlying value
 */
export function podValueOrTupleFromRawValue(
  podRawValue: PODRawValue | PODRawValueTuple
): PODValue | PODValueTuple {
  return applyOrMap(podValueFromRawValue, podRawValue);
}

/**
 * Deserializes `PODEntries` from the simplified format produced by
 * {@link podEntriesToSimplifiedJSON}.  Type information is inferred from the values
 * in a way which should preserve hashing and circuit behavior, but isn't
 * guaranteed to be identical to the types before serialization.  For instance,
 * small numbers are always annotated as `int`, rather than `cryptographic`.
 *
 * @param serializedEntries a string representation of `PODEntries`
 * @returns `PODEntries` deserialized from the string
 * @throws if the serialized form is invalid
 */
export function podEntriesFromSimplifiedJSON(
  simplifiedJSON: string
): PODEntries {
  const simplifiedEntries = JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).parse(simplifiedJSON) as Record<string, PODRawValue>;
  const entries: Record<string, PODValue> = {};
  for (const [entryName, rawValue] of Object.entries(simplifiedEntries)) {
    entries[entryName] = podValueFromRawValue(rawValue);
  }
  return entries;
}
