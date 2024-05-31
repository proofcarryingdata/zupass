import JSONBig from "json-bigint";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  PODEntries,
  PODRawValue,
  PODRawValueTuple,
  PODValue,
  PODValueTuple,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  POD_NAME_REGEX,
  POD_STRING_TYPE_REGEX,
  POD_VALUE_STRING_TYPE_IDENTIFIER
} from "./podTypes";

// TODO(POD-P3): Decide if these utils should all be published outside
// of the package, or only a subset.

/**
 * Private keys are 32 bytes (any arbitrary bytes), represented as hex,
 * Base64, or URL-safe Base64.  Base64 padding is optional.
 *
 * This regex matches any supported format, with match groups usable to
 * determine the format, in the order above.
 */
export const PRIVATE_KEY_REGEX = new RegExp(
  /^(?:([0-9A-Fa-f]{64})|([A-Za-z0-9+/]{43}=?)|([A-Za-z0-9_-]{43}=?))$/
);

/**
 * Public keys are 32 bytes (a packed elliptic curve point), represented as hex,
 * Base64, or URL-safe Base64.  Base64 padding is optional.
 *
 * This regex matches any supported format, with match groups usable to
 * determine the format, in the order above.
 */
export const PUBLIC_KEY_REGEX = new RegExp(
  /^(?:([0-9A-Fa-f]{64})|([A-Za-z0-9+/]{43}=?)|([A-Za-z0-9_-]{43}=?))$/
);

/**
 * Signatures are 64 bytes (one packed elliptic curve point, one scalar),
 * represented as hex, Base64, or URL-safe Base64.  Base64 padding is optional.
 *
 * This regex matches any supported format, with match groups usable to
 * determine the format, in the order above.
 */
export const SIGNATURE_REGEX = new RegExp(
  /^(?:([0-9A-Fa-f]{128})|([A-Za-z0-9+/]{86}(?:==)?)|([A-Za-z0-9_-]{86}(?:==)))$/
);

/**
 * Checks that the input matches the proper format for a private key, as given
 * by {@link PRIVATE_KEY_REGEX}.
 *
 * @param privateKey the string to check
 * @returns the unmodified input, for easy chaining
 * @throws TypeError if the format doesn't match
 */
export function checkPrivateKeyFormat(privateKey: string): string {
  decodeBytesAuto(
    privateKey,
    PRIVATE_KEY_REGEX,
    "Private key should be 32 bytes, encoded as hex or Base64."
  );
  return privateKey;
}

/**
 * Checks that the input matches the proper format for a public key, as given
 * by {@link PUBLIC_KEY_REGEX}.
 *
 * @param nameForErrorMessages the name of this value, which is used only for
 *   error messages (not checked for legality).
 * @param publicKey the string to check
 * @returns the unmodified input, for easy chaining
 * @throws TypeError if the format doesn't match
 */
export function checkPublicKeyFormat(
  publicKey: string,
  nameForErrorMessages?: string
): string {
  if (
    !publicKey ||
    typeof publicKey !== "string" ||
    !publicKey.match(PUBLIC_KEY_REGEX)
  ) {
    throw new TypeError(
      "Public key should be 32 bytes hex-encoded" +
        (nameForErrorMessages ? ` in ${nameForErrorMessages}.` : ".")
    );
  }
  return publicKey;
}

/**
 * Checks that the input matches the proper format for a signature, as given
 * by {@link SIGNATURE_REGEX}.
 *
 * @param signature the string to check
 * @returns the unmodified input, for easy chaining
 * @throws TypeError if the format doesn't match
 */
export function checkSignatureFormat(signature: string): string {
  if (
    !signature ||
    typeof signature !== "string" ||
    !signature.match(SIGNATURE_REGEX)
  ) {
    throw new TypeError("Signature should be 64 bytes hex-encoded.");
  }
  return signature;
}

/**
 * Checks that the input matches the proper format for an entry name, as given
 * by {@link POD_NAME_REGEX}.
 *
 * @param name the string to check
 * @returns the unmodified input, for easy chaining
 * @throws TypeError if the format doesn't match
 */
export function checkPODName(name?: string): string {
  if (!name) {
    throw new TypeError("POD names cannot be undefined.");
  }
  if (typeof name !== "string") {
    throw new TypeError("POD names must be strings.");
  }
  if (name.match(POD_NAME_REGEX) === null) {
    throw new TypeError(`Invalid POD name "${name}". \
      Only alphanumeric characters and underscores are allowed.`);
  }
  return name;
}

/**
 * Checks that `value` has the run-time type given by `typeName`.  Works for
 * any Typescript Type.
 *
 * @param nameForErrorMessages the name for this value, used only for error
 *   messages.
 * @param value the value to check
 * @param typeName the expected type
 * @throws TypeError if the value does not have the expected type
 */
export function requireType(
  nameForErrorMessages: string,
  value: unknown,
  typeName: string
): void {
  if (typeof value !== typeName) {
    throw new TypeError(
      `Invalid value for entry ${nameForErrorMessages}.  Expected type ${typeName}.`
    );
  }
}

/**
 * Checks that `value` has the run-time type given by `typeName`.  Compile-time
 * type of input/output is limited to expected POD value types.
 *
 * @param nameForErrorMessages the name for this value, used only for error
 *   messages.
 * @param value the value to check
 * @param typeName the expected type
 * @returns the value unmodified, for easy chaining
 * @throws TypeError if the value does not have the expected type
 */
export function requireValueType(
  nameForErrorMessages: string,
  value: PODRawValue,
  typeName: string
): PODRawValue {
  requireType(nameForErrorMessages, value, typeName);
  return value;
}

/**
 * Checks string-encoded value type prefix for its validity, i.e. that
 * it is actually of type {@link POD_VALUE_STRING_TYPE_IDENTIFIER}.
 *
 * @param nameForErrorMessages the name of the value from which the type name is
 *   derived, used only for error messages.
 * @param typePrefix the type prefix to check
 * @returns the type prefix as the appropriate type
 * @throws Error if the type prefix is invalid
 */
export function checkStringEncodedValueType(
  nameForErrorMessages: string,
  typePrefix: string
): POD_VALUE_STRING_TYPE_IDENTIFIER {
  if (typePrefix === EDDSA_PUBKEY_TYPE_STRING || typePrefix === "string") {
    return typePrefix;
  } else {
    throw new Error(
      `Invalid string-encoded value type ${typePrefix} in ${nameForErrorMessages}.`
    );
  }
}

/**
 * Checks that the given value is between the given bounds.  The bounds are
 * both inclusive, so that they can also be legal values in the same bounds.
 *
 * @param nameForErrorMessages the name of this value, used only for error
 *   messages
 * @param value the value to check
 * @param minValue the minimum legal value (inclusive lower bound)
 * @param maxValue the maximum legal value (inclusive upper bound)
 * @returns the value unmodified, for easy chaining
 * @throws TypeError if the value is outside of the bounds
 */
export function checkBigintBounds(
  nameForErrorMessages: string,
  value: bigint,
  minValue: bigint,
  maxValue: bigint
): bigint {
  if (value < minValue || value > maxValue) {
    throw new TypeError(
      `Invalid value for entry ${nameForErrorMessages}. \
      Value ${value} is outside supported bounds: (min ${minValue}, max ${maxValue}).`
    );
  }
  return value;
}

/**
 * Check that `PODValue` object has a value which matches the specified type.
 *
 * @param nameForErrorMessages the name of this value, which is used only for
 *   error messages (not checked for legality).
 * @param podValue the value to check
 * @returns the unmodified value, for easy chaining
 * @throws TypeError if the value is invalid
 */
export function checkPODValue(
  nameForErrorMessages: string,
  podValue?: PODValue
): PODValue {
  if (podValue === undefined || podValue.value === undefined) {
    throw new TypeError(
      `POD value for ${nameForErrorMessages} cannot be undefined.`
    );
  }

  if (podValue.type === undefined) {
    throw new TypeError(
      `POD value for ${nameForErrorMessages} must have a type.`
    );
  }
  switch (podValue.type) {
    case "string":
      requireValueType(nameForErrorMessages, podValue.value, "string");
      break;
    case "cryptographic":
      requireValueType(nameForErrorMessages, podValue.value, "bigint");
      checkBigintBounds(
        nameForErrorMessages,
        podValue.value,
        POD_CRYPTOGRAPHIC_MIN,
        POD_CRYPTOGRAPHIC_MAX
      );
      break;
    case "int":
      requireValueType(nameForErrorMessages, podValue.value, "bigint");
      checkBigintBounds(
        nameForErrorMessages,
        podValue.value,
        POD_INT_MIN,
        POD_INT_MAX
      );
      break;
    case EDDSA_PUBKEY_TYPE_STRING:
      requireValueType(nameForErrorMessages, podValue.value, "string");
      checkPublicKeyFormat(podValue.value, nameForErrorMessages);
      break;
    default:
      throw new TypeError(
        `POD value ${nameForErrorMessages} has unknown type ${
          (podValue as PODValue).type
        }`
      );
  }
  return podValue;
}

/**
 * Checks whether a given value is a fixed-size numeric value, which can be
 * represented in a circuit as a single signal.
 *
 * @param podValue the value to check
 * @returns `true` if the given value is numeric
 */
export function isPODNumericValue(podValue: PODValue): boolean {
  return getPODValueForCircuit(podValue) !== undefined;
}

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
    return `${EDDSA_PUBKEY_TYPE_STRING}:${podValue.value}`;
  } else if (
    podValue.type === "string" &&
    podValue.value.match(POD_STRING_TYPE_REGEX)
  ) {
    return `string:${podValue.value}`;
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
export type CryptoBytesEncoding = "hex" | "base64" | "base64url";

/**
 * Encode cryptographic bytes (keys, signatures) in the given encoding.
 *
 * @param bytes raw bytes to encoded
 * @param encoding one of the supported encoding specifiers.  Default is
 *   `base64url` which is the shortest.
 * @returns a string encoding of the bytes
 */
export function encodeBytes(
  bytes: Uint8Array,
  encoding: CryptoBytesEncoding = "base64url"
): string {
  return Buffer.from(bytes).toString(encoding);
}

/**
 * Decodes cryptographic bytes (keys, signatures) using the given encoding.
 * Note that this function doesn't check that the input is actually valid, but
 * will truncate the output to only the valid prefix of input.
 *
 * @param encoded the encoded string
 * @param encoding one of the supported encoding specifiers.  Default is
 *   `base64url` which is the shortest.
 * @returns decoded bytes, truncated if the input does not properly match the
 *   encoding format
 */
export function decodeBytes(
  encoded: string,
  encoding: CryptoBytesEncoding = "base64url"
): Buffer {
  return Buffer.from(encoded, encoding);
}

/**
 * Decodes cryptographic bytes from a string, auto-determining the encoding
 * based on the input length and character set.
 *
 * @param encoded the string-encoded bytesd
 * @param encodingPattern a regex which matches valid encodings of bytes with
 *   an expected fixed size.  This pattern is expected to have groups
 *   separately matching each of the supported encodings in order.  See
 *   {@link PRIVATE_KEY_REGEX} for an example.
 * @param errorMessage human-readable message for error thrown if decoding
 *  fails.
 * @throws TypeError if the pattern doesn't match
 */
export function decodeBytesAuto(
  encoded: string,
  encodingPattern: RegExp,
  errorMessage?: string
): Buffer {
  //  console.log("decodePrivateKey", encoded, encodingPattern);
  if (encoded && typeof encoded === "string" && encoded !== "") {
    const matched = encoded.match(encodingPattern);
    //    console.log("decodePrivateKey", matched);
    if (matched !== null) {
      if (matched[3] && matched[3] !== "") {
        return decodeBytes(encoded, "base64url");
      }
      if (matched[2] && matched[2] !== "") {
        return decodeBytes(encoded, "base64");
      }
      if (matched[1] && matched[1] !== "") {
        return decodeBytes(encoded, "hex");
      }
      // Fallthrough if no group matches.
    }
  }
  throw new TypeError(errorMessage);
}
