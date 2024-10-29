import {
  EDDSA_PUBKEY_TYPE_STRING,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  POD_NAME_REGEX,
  POD_VALUE_STRING_TYPE_IDENTIFIER,
  PODEntries,
  PODName,
  PODRawValue,
  PODValue
} from "./podTypes";
import {
  CryptoBytesEncodingGroups,
  decodeBytesAuto,
  getPODValueForCircuit
} from "./podUtil";

/**
 * Private keys are 32 bytes (any arbitrary bytes), represented as Base64 or
 * hexadecimal
 *
 * This regex matches any supported format, with match groups usable to
 * determine the format, in the order above.
 */
export const PRIVATE_KEY_REGEX = new RegExp(
  /^(?:([A-Za-z0-9+/]{43}=?)|([0-9A-Fa-f]{64}))$/
);

/**
 * Public keys are 32 bytes (a packed elliptic curve point), represented as
 * Base64 or hexadecimal.  Base64 padding is optional.
 *
 * This regex matches any supported format, with match groups usable to
 * determine the format, in the order above.
 */
export const PUBLIC_KEY_REGEX = new RegExp(
  /^(?:([A-Za-z0-9+/]{43}=?)|([0-9A-Fa-f]{64}))$/
);

/**
 * Description of the match groups in {@link PUBLIC_KEY_REGEX} and how they
 * map to encoding formats, as needed by {@link decodeBytesAuto}.
 */
export const PUBLIC_KEY_ENCODING_GROUPS: CryptoBytesEncodingGroups = [
  { index: 1, encoding: "base64" },
  { index: 2, encoding: "hex" }
];

/**
 * Signatures are 64 bytes (one packed elliptic curve point, one scalar),
 * represented as Base64 or hexadecimal.  Base64 padding is optional.
 *
 * This regex matches any supported format, with match groups usable to
 * determine the format, in the order above.
 */
export const SIGNATURE_REGEX = new RegExp(
  /^(?:([A-Za-z0-9+/]{86}(?:==)?)|([0-9A-Fa-f]{128}))$/
);

/**
 * Description of the match groups in {@link SIGNATURE_REGEX} and how they
 * map to encoding formats, as needed by {@link decodeBytesAuto}.
 */
export const SIGNATURE_ENCODING_GROUPS: CryptoBytesEncodingGroups = [
  { index: 1, encoding: "base64" },
  { index: 2, encoding: "hex" }
];

/**
 * Description of the match groups in {@link PRIVATE_KEY_REGEX} and how they
 * map to encoding formats, as needed by {@link decodeBytesAuto}.
 */
export const PRIVATE_KEY_ENCODING_GROUPS: CryptoBytesEncodingGroups = [
  { index: 1, encoding: "base64" },
  { index: 2, encoding: "hex" }
];

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
    PRIVATE_KEY_ENCODING_GROUPS,
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
  decodeBytesAuto(
    publicKey,
    PUBLIC_KEY_REGEX,
    PUBLIC_KEY_ENCODING_GROUPS,
    "Public key should be 32 bytes, encoded as hex or Base64" +
      (nameForErrorMessages ? ` in ${nameForErrorMessages}.` : ".")
  );
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
  decodeBytesAuto(
    signature,
    SIGNATURE_REGEX,
    SIGNATURE_ENCODING_GROUPS,
    "Signature should be 64 bytes, encoded as hex or Base64."
  );
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
export function checkPODName(name?: string): PODName {
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
 * Checks that the input matches the proper format for {@link PODEntries}, by
 * checking each name and value in turn.
 *
 * @param podEntries the entries to check
 * @throws TypeError if the input type, or any of the names or values are
 *   invalid
 * @throws RangeError if a value is outside of the bounds
 */
export function checkPODEntries(podEntries: PODEntries): void {
  requireType("entries", podEntries, "object");
  for (const [n, v] of Object.entries(podEntries)) {
    checkPODName(n);
    checkPODValue(n, v);
  }
}

/**
 * Checks that `value` has the run-time type given by `typeName`.
 *
 * Works for any runtime JavaScript type, but two values have special meaning.
 * "object" is used specifically to require a non-null non-array object, while
 * "array" is used to mean a non-null array object.
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
  switch (typeName) {
    case "object":
      if (typeof value !== "object" || Array.isArray(value) || value === null) {
        throw new TypeError(
          `Invalid value for entry ${nameForErrorMessages}.  \
          Expected a non-array non-null object.`
        );
      }
      break;
    case "array":
      if (typeof value !== "object" || !Array.isArray(value)) {
        throw new TypeError(
          `Invalid value for entry ${nameForErrorMessages}.  \
          Expected an array.`
        );
      }
      break;
    default:
      if (typeof value !== typeName) {
        throw new TypeError(
          `Invalid value for entry ${nameForErrorMessages}.  \
          Expected type ${typeName}.`
        );
      }
      break;
  }
}

/**
 * Checks that `value` has the run-time type given by `typeName`, and returns
 * the value for easy chaining.
 *
 * Works identically to {@link requireType} except that the compile-time type of
 * input/output is limited to expected POD value types to help catch errors
 * at compile time.
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
 * @throws RangeError if the value is outside of the bounds
 */
export function checkBigintBounds(
  nameForErrorMessages: string,
  value: bigint,
  minValue: bigint,
  maxValue: bigint
): bigint {
  if (value < minValue || value > maxValue) {
    throw new RangeError(
      `Invalid value for entry ${nameForErrorMessages}.  ` +
        `Value ${value} is outside supported bounds: (min ${minValue}, max ${maxValue}).`
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
 * @throws RangeError if the value is outside of the bounds
 */
export function checkPODValue(
  nameForErrorMessages: string,
  podValue?: PODValue
): PODValue {
  if (podValue === null) {
    throw new TypeError(
      `POD value for ${nameForErrorMessages} cannot be null.`
    );
  }
  if (podValue === undefined || podValue.value === undefined) {
    throw new TypeError(
      `POD value for ${nameForErrorMessages} cannot be undefined.`
    );
  }
  if (podValue.value === null) {
    throw new TypeError(
      `POD value for ${nameForErrorMessages} cannot be null.`
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
