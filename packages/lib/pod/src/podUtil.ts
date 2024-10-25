import { podValueToJSON } from "./podJSON";
import { PODEntries, PODValue, PODValueTuple } from "./podTypes";

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
    case "bytes":
    case "eddsa_pubkey":
    case "null":
      return undefined;
    case "int":
    case "cryptographic":
      return podValue.value;
    case "boolean":
      return podValue.value ? 1n : 0n;
    case "date":
      return BigInt(podValue.value.getTime());
    default:
      return undefined;
  }
}

/**
 * Makes a safe copy of a PODValue, so that modfications to the new value
 * will not affect the original.
 */
export function clonePODValue(podValue: PODValue): PODValue {
  // TODO(POD-P5): When we support containers as values, this will have
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
 * Converts a POD value to a human-readable string for logging our user display
 * purposes.  The output is based on the {@link JSONPODValue} format, but also
 * allows the entire value to be undefined
 *
 * @param podValue the POD value (or undefined) to print
 * @returns a human-readable string
 * @throws if the POD value is malformed
 */
export function printPODValue(podValue: PODValue | undefined): string {
  return JSON.stringify(podValue ? podValueToJSON(podValue) : undefined);
}

/**
 * Converts a POD value or tuple to a human-readable string for logging our user
 * display purposes.  The output is based on the {@link JSONPODValue} format,
 * but also handles the case where the whole value is undefined (but not
 * undefined values inside of a tuple).
 *
 * @param podValue the POD value (or undefined) to print
 * @returns a human-readable string
 * @throws if the POD value is malformed
 */
export function printPODValueOrTuple(
  value: PODValue | PODValueTuple | undefined
): string {
  return JSON.stringify(
    value
      ? Array.isArray(value)
        ? value.map((v) => podValueToJSON(v))
        : podValueToJSON(value)
      : undefined
  );
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
 * @param encoded the string-encoded bytes
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
  if (encoded && typeof encoded === "string" && encoded !== "") {
    const matched = encoded.match(encodingPattern);
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
  throw new TypeError(errorMessage ?? "Invalid encoded bytes");
}
