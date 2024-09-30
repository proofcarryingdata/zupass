import JSONBig from "json-bigint";
import { checkStringEncodedValueType } from "./podChecks";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  PODEntries,
  PODRawValue,
  PODRawValueTuple,
  PODValue,
  PODValueTuple,
  POD_INT_MAX,
  POD_STRING_TYPE_REGEX
} from "./podTypes";

/**
 * Gets the numeric representation of the given value for inclusion in a
 * circuit, if any.
 *
 * @param podValue the value to convert
 * @returns the numeric value, or undefined if this value cannot be represented
 *   in a circuit
 */
export function getPODValueForCircuit(podValue: PODValue): bigint | undefined {
  switch (podValue.type) {
    case "string":
      return undefined;
    case "int":
    case "cryptographic":
      return podValue.value;
    default:
      return undefined;
  }
}

/**
 * Makes a safe copy of a PODValue, so that modfications to the new value
 * will not affect the original.
 */
export function clonePODValue(podValue: PODValue): PODValue {
  // TODO(POD-P3): When we support containers as values, this will have
  // to become more complex.
  return { ...podValue };
}

/**
 * Makes a safe copy of a PODValue (or undefined), so that modfications to the
 * new value will not affect the original.
 */
export function cloneOptionalPODValue(
  podValue: PODValue | undefined
): PODValue | undefined {
  if (podValue === undefined) {
    return undefined;
  }
  return clonePODValue(podValue);
}

/**
 * Makes a safe copy of the given `PODEntries`, so that modfications to the
 * new entries will not affect the original.
 */
export function clonePODEntries(entries: PODEntries): PODEntries {
  const newEntries: PODEntries = {};
  for (const [entryName, entryValue] of Object.entries(entries)) {
    newEntries[entryName] = clonePODValue(entryValue);
  }
  return newEntries;
}

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

/**
 * Computation streamliner involving unions of the form A | A[] and functions of the form f: A -> B. It applies f to inputs of type A and maps f over A[] otherwise.
 *
 * @param f function to apply to input
 * @param input input argument
 * @returns result of appropriate application of function to input
 */
export function applyOrMap<A, B>(f: (a: A) => B, input: A | A[]): B | B[] {
  return Array.isArray(input) ? (input as A[]).map(f) : f(input as A);
}

/**
 * Supported encodings for cryptographic bytes (keys, signatures) used in
 * this library.
 */
export type CryptoBytesEncoding = "hex" | "base64";

/**
 * Description of the match groups in a regex used by {@link decodeBytesAuto}.
 * If the regex matches, the decoding function will check for a non-empty
 * match in each listed group number in order, and decode using the specified
 * encoding.
 */
export type CryptoBytesEncodingGroups = {
  index: number;
  encoding: CryptoBytesEncoding;
}[];

/**
 * Encode cryptographic bytes (keys, signatures) in the given encoding.
 *
 * @param bytes raw bytes to encoded
 * @param encoding one of the supported encoding specifiers.  Default is
 *   `base64`, and padding is always stripped from base64 encoded output.
 * @returns a string encoding of the bytes
 */
export function encodeBytes(
  bytes: Uint8Array,
  encoding: CryptoBytesEncoding = "base64"
): string {
  const encoded = Buffer.from(bytes).toString(encoding);
  if (encoding === "base64") {
    return stripBase64Padding(encoded);
  }
  return encoded;
}

/**
 * Strips the padding `=` characters from a Base64 encoded string.
 * The input is assumed to be valid Base64, meaning there should be 0, 1, or 2
 * padding characters.  If there is no padding, this function returns the input
 * unmodified.
 *
 * @param encoded Base64 encoded string
 * @returns the same string without padding
 */
function stripBase64Padding(encoded: string): string {
  if (encoded.endsWith("==")) {
    return encoded.slice(0, encoded.length - 2);
  } else if (encoded.endsWith("=")) {
    return encoded.slice(0, encoded.length - 1);
  } else {
    return encoded;
  }
}

/**
 * Decodes cryptographic bytes (keys, signatures) using the given encoding.
 * Note that this function doesn't check that the input is actually valid, but
 * will truncate the output to only the valid prefix of input.
 *
 * @param encoded the encoded string
 * @param encoding one of the supported encoding specifiers.  Default is
 *   `base64`, and padding is always stripped from base64 encoded output.
 * @returns decoded bytes, truncated if the input does not properly match the
 *   encoding format
 */
export function decodeBytesRaw(
  encoded: string,
  encoding: CryptoBytesEncoding = "base64"
): Buffer {
  // Buffer's base64 decoding can accept padded or unpadded strings.
  return Buffer.from(encoded, encoding);
}

/**
 * Decodes cryptographic bytes from a string, auto-determining the encoding
 * based on the input length and character set.
 *
 * @param encoded the string-encoded bytesd
 * @param encodingPattern a regex which matches valid encodings of bytes with
 *   an expected fixed size.  This pattern is expected to have groups
 *   separately matching each of the supported encodings.  See
 *   {@link PRIVATE_KEY_REGEX} for an example.
 * @param encodingGroups a description of the match groups in the regex,
 *   in the order they should be checked.
 * @param errorMessage human-readable message for error thrown if decoding
 *  fails.
 * @throws TypeError if the pattern doesn't match
 */
export function decodeBytesAuto(
  encoded: string,
  encodingPattern: RegExp,
  encodingGroups: CryptoBytesEncodingGroups,
  errorMessage?: string
): Buffer {
  //  console.log("decodePrivateKey", encoded, encodingPattern);
  if (encoded && typeof encoded === "string" && encoded !== "") {
    const matched = encoded.match(encodingPattern);
    //    console.log("decodePrivateKey", matched);
    if (matched !== null) {
      for (const encodingGroup of encodingGroups) {
        if (
          matched[encodingGroup.index] &&
          matched[encodingGroup.index] !== ""
        ) {
          return decodeBytesRaw(encoded, encodingGroup.encoding);
        }
      }
      // Fallthrough if no group matches.
    }
  }
  throw new TypeError(errorMessage);
}
