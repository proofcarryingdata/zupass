import JSONBig from "json-bigint";
import {
  EDDSA_PUBKEY_PREFIX,
  PODEntries,
  PODRawValue,
  PODRawValueTuple,
  PODValue,
  PODValueTuple,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  POD_NAME_REGEX
} from "./podTypes";

// TODO(POD-P3): Decide if these utils should all be published outside
// of the package, or only a subset.

// TODO(POD-P2): Consider Base64 encoding rather than hex for the formats
// below.  It would be smaller.

/**
 * Private keys are 32 bytes (any arbitrary bytes), represented as 64 hex
 * digits.
 */
const PRIVATE_KEY_REGEX = new RegExp(/^[0-9A-Fa-f]{64}$/);

/**
 * Public keys are 32 bytes (a packed elliptic curve point), represented as 64
 * hex digits.
 */
const PUBLIC_KEY_REGEX = new RegExp(/^[0-9A-Fa-f]{64}$/);

/**
 * Signatures are 64 bytes (one packed elliptic curve point, one scalar),
 * represented as 128 hex digits.
 */
const SIGNATURE_REGEX = new RegExp(/^[0-9A-Fa-f]{128}$/);

/**
 * Checks that the input matches the proper format for a private key, as given
 * by {@link PRIVATE_KEY_REGEX}.
 *
 * @param privateKey the string to check
 * @returns the unmodified input, for easy chaining
 * @throws TypeError if the format doesn't match
 */
export function checkPrivateKeyFormat(privateKey: string): string {
  if (
    !privateKey ||
    typeof privateKey !== "string" ||
    !privateKey.match(PRIVATE_KEY_REGEX)
  ) {
    throw new TypeError("Private key should be 32 bytes hex-encoded.");
  }
  return privateKey;
}

/**
 * Checks that the input matches the proper format for a public key, as given
 * by {@link PUBLIC_KEY_REGEX}.
 *
 * @param publicKey the string to check
 * @returns the unmodified input, for easy chaining
 * @throws TypeError if the format doesn't match
 */
export function checkPublicKeyFormat(publicKey: string): string {
  if (
    !publicKey ||
    typeof publicKey !== "string" ||
    !publicKey.match(PUBLIC_KEY_REGEX)
  ) {
    throw new TypeError("Public key should be 32 bytes hex-encoded.");
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
    case "eddsa-pubkey":
      requireValueType(nameForErrorMessages, podValue.value, "string");
      checkPublicKeyFormat(podValue.value);
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
  if (podValue.type === "eddsa-pubkey") {
    return `${EDDSA_PUBKEY_PREFIX}:${podValue.value}`;
  } else if (podValue.type === "string") {
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
      const separatorIndex = rawValue.search(/:/);
      const prefix = rawValue.slice(0, separatorIndex);
      const payload = rawValue.slice(separatorIndex + 1);
      return prefix === EDDSA_PUBKEY_PREFIX
        ? { type: "eddsa-pubkey", value: payload }
        : prefix === "string"
        ? { type: "string", value: payload }
        : { type: "string", value: rawValue };
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
