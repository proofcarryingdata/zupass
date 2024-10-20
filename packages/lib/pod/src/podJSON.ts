import { checkPODName, checkPODValue, requireType } from "./podChecks";
import { PODEntries, PODName, PODValue } from "./podTypes";

/**
 * Defines the JSON encoding of a POD.  Unlike the {@link POD} class, objects
 * which fit this type contain only JSON-compatible types (no bigints).
 * They can thus be freely combined with other JSON and serialized using
 * JSON.stringify.  See {@link JSONPODValue} for details of the encodings used.
 */
export type JSONPOD = {
  entries: JSONPODEntries;
  signature: string;
  signerPublicKey: string;
};

/**
 * Defines the JSON encoding of a POD value.  Unlike the {@link PODValue} type,
 * values which fit this type contain only JSON-compatible types (no bigints).
 * They can thus be freely combined with other JSON and serialized using
 * JSON.stringify.
 *
 * For each PODValue type, there can be up to 3 possible encoding formats,
 * which are intended to allow terse and human-readable.
 * - A bare JSON type, such as `number` for int, and `string` for string
 * - A terse JSON object with the PODValue type as its only key, like
 *   `{ "int": 123 }`
 * - An explicit JSON object with 2 keys, like `{ "type": "int", "value": 123 }`
 *
 * Use {@link podValueToJSON} and {@link podValueFromJSON} to convert between
 * JSON and non-JSON formats.  When parsing, any of the encodings above will
 * be produced.  When producing JSON, the smallest encoding will be used.
 *
 * See the individual subtypes for more information on specific encoding
 * requirements and assumptions.
 */
export type JSONPODValue =
  | JSONPODStringValue
  | JSONPODIntValue
  | JSONPODCryptographicValue
  | JSONPODEdDSAPublicKeyValue;

/**
 * Defines the JSON encoding of a tuple of POD values.  This is simply an
 * array of {@link JSONPODValue} objects described elsewhere.
 */
export type JSONPODValueTuple = JSONPODValue[];

/**
 * {@link JSONPODValue} type for string entries.  These can be most simply
 * encoded as a JSON string, which is reserved for this type.
 */
export type JSONPODStringValue = string | { string: string };

/**
 * {@link JSONPODValue} type for int entries.  These can be most simply
 * encoded as a JSON number, but only if they are in the range between
 * `Number.MIN_SAFE_INTEGER` and `Number.MAX_SAFE_INTEGER` where no accuracy
 * is lost.  Larger positive/negative values must be stringified and use one of
 * the other encodings to specify value type.  Any string encoding accepted by
 * `BigInt(s)` is acceptable.
 */
export type JSONPODIntValue = number | { int: number | string };

/**
 * {@link JSONPODValue} type for cryptographic entries.  These must always use
 * an explicit typed object since a bare `number` is reserved for int values.
 * The value within the typed object can be a `number` if it is in the safe
 * range between `Number.MIN_SAFE_INTEGER` and `Number.MAX_SAFE_INTEGER` where
 * no accuracy is lost.  Otherwise any string encoding accepted by `BigInt(s)`
 * is acceptable.
 */
export type JSONPODCryptographicValue = { cryptographic: number | string };

/**
 * {@link JSONPODValue} type for EdDSA public key entries.  These must always
 * use an explicit typed object since a bare `string` is reserved for string
 * values.  The value within the typed object should be a string in a format
 * accepted by {@link decodePublicKey}.
 */
export type JSONPODEdDSAPublicKeyValue = { eddsa_pubkey: string };

/**
 * Defines the JSON encoding a set of POD entries.  Unlike the
 * {@link PODEntries} type, values which fit this type contain only
 * JSON-compatible types (no bigints).  They can thus be freely combined with
 * other JSON and serialized using JSON.stringify.
 *
 * See {@link JSONPODValue} for the specifics of value encoding and parsing.
 * Use {@link podEntriesToJSON} and {@link podEntriesFromJSON} to convert
 * between JSON and non-JSON formats.  When parsing, any of the encodings above
 * will be produced.
 */
export type JSONPODEntries = Record<PODName, JSONPODValue>;

/**
 * Parses {@link PODEntries} from the JSON-compatible format potentially
 * coming directly from `JSON.parse`.
 *
 * @param jsonEntries the JSON-encoded POD entries to parse
 * @returns a standard TypeScript POD entries representation
 * @throws TypeError if the input entries are not validly formed
 * @throws RangeError if a value is outside of the bounds
 * @throws SyntaxError if a value is unparseable
 */
export function podEntriesFromJSON(jsonEntries: JSONPODEntries): PODEntries {
  requireType("jsonEntries", jsonEntries, "object");
  return Object.fromEntries(
    Object.entries(jsonEntries).map(([name, jsonValue]) => [
      checkPODName(name),
      podValueFromJSON(jsonValue, name)
    ])
  );
}

/**
 * Parses a {@link PODValue} from the JSON-compatible format potentially
 * coming directly from `JSON.parse`.
 *
 * @param jsonValue the JSON-encoded POD value to parse
 * @param nameForErrorMessages an optional name for this value to be used
 *   in error messages
 * @returns a standard TypeScript POD value
 * @throws TypeError if the input value is not validly formed
 * @throws RangeError if a value is outside of the bounds
 * @throws SyntaxError if a value is unparseable
 */
export function podValueFromJSON(
  jsonValue: JSONPODValue,
  nameForErrorMessages?: string
): PODValue {
  nameForErrorMessages = nameForErrorMessages || "(unnamed)";
  switch (typeof jsonValue) {
    case "string":
      return podValueFromTypedJSON("string", jsonValue, nameForErrorMessages);
    case "number":
      return podValueFromTypedJSON("int", jsonValue, nameForErrorMessages);
    case "object":
      if (Array.isArray(jsonValue)) {
        throw new TypeError(
          `Value ${nameForErrorMessages} isn't a well-formed JSON POD Value.` +
            "  It should be an object not an array."
        );
      }
      if (
        jsonValue === null ||
        Array.isArray(jsonValue) ||
        Object.keys(jsonValue).length !== 1
      ) {
        throw new TypeError(
          `Value ${nameForErrorMessages} isn't a well-formed JSON POD Value.` +
            "  It should be an object with a single key."
        );
      }
      const [n, v] = Object.entries(jsonValue)[0];
      return podValueFromTypedJSON(n, v, nameForErrorMessages);
    default:
      throw new TypeError(
        `Value ${nameForErrorMessages} has invalid type '${typeof jsonValue}'.`
      );
  }
}

/**
 * Parses a {@link PODValue} from JSON-compatible inputs which have already
 * been parsed into separate `type` and `value`.  Most use cases should use
 * {@link podValueFromJSON} instead.  This function is intended as a helper
 * for other parsers with their own source of type information.
 *
 * @param podValueType the type of {@link PODValue} expected
 * @param jsonRawValue the JSON-compatible encoding of the bare value with
 *   no type information
 * @param nameForErrorMessages an optional name for this value to be used
 *   in error messages
 * @returns a standard TypeScript POD value
 * @throws TypeError if the input type or value are not validly formed
 * @throws RangeError if a value is outside of the bounds
 * @throws SyntaxError if a value is unparseable
 */
export function podValueFromTypedJSON(
  podValueType: string,
  jsonRawValue: number | string,
  nameForErrorMessages?: string
): PODValue {
  nameForErrorMessages = nameForErrorMessages || "(unnamed)";
  switch (podValueType) {
    case "string":
      return checkPODValue(nameForErrorMessages, {
        type: "string",
        value: jsonRawValue as string // checkPODValue check this
      });
    case "int":
      return checkPODValue(nameForErrorMessages, {
        type: "int",
        value: bigintFromJSON(jsonRawValue, nameForErrorMessages)
      });
    case "cryptographic":
      return checkPODValue(nameForErrorMessages, {
        type: "cryptographic",
        value: bigintFromJSON(jsonRawValue, nameForErrorMessages)
      });
    case "eddsa_pubkey":
      return checkPODValue(nameForErrorMessages, {
        type: "eddsa_pubkey",
        value: jsonRawValue as string
      });
    default:
      throw new TypeError(
        `Value ${nameForErrorMessages} specifies unknown type '${podValueType}'.`
      );
  }
}

/**
 * Parses an integer value into a `bigint` from JSON-compatible value encoding
 * separate from type inforation.  Most use cases should use
 * {@link podValueFromJSON} instead.  This function is intended as a helper
 * for other parsers with their own source of type information.
 *
 * @param numericValue the encoded numeric value, which could be a number, or
 *   a stringified number
 * @param nameForErrorMessages an optional name for this value to be used
 *   in error messages
 * @returns a bigint representing the number
 * @throws TypeError if the input type or value are not validly formed
 * @throws RangeError if a value is outside of the bounds
 * @throws SyntaxError if a value is unparseable
 */
export function bigintFromJSON(
  numericValue: number | string,
  nameForErrorMessages?: string
): bigint {
  nameForErrorMessages = nameForErrorMessages || "(unnamed)";
  switch (typeof numericValue) {
    case "number":
      if (
        numericValue > Number.MAX_SAFE_INTEGER ||
        numericValue < Number.MIN_SAFE_INTEGER
      ) {
        // This is to catch a mistake in JSON generation as early as possible.
        // JSON.parse will parse overly large values but lose accuracy.
        // Throwing here is more informative than waiting for a signature
        // validation to fail.
        throw new RangeError(
          `Numeric value ${nameForErrorMessages} is too large to be safely` +
            " represented in JSON and must be stringified instead."
        );
      }
      return BigInt(numericValue);
    case "string":
      return BigInt(numericValue);
    default:
      throw new TypeError(
        `Value ${nameForErrorMessages} is an unexpected type ` +
          `'${typeof numericValue}'.  Numeric values must be encoded as a ` +
          "number or string."
      );
  }
}

/**
 * Converts {@link PODEntries} from the TypeScript format used internally, into
 * a JSON-compatible format safe to serialize with `JSON.stringify`.  This
 * function will produce the simplest of the available encodings which can
 * represent the input with no loss value or type information.
 *
 * @param podEntries the POD entries to convert
 * @returns a JSON-compatible representation
 * @throws TypeError if the input entries are not validly formed
 */
export function podEntriesToJSON(podEntries: PODEntries): JSONPODEntries {
  requireType("podEntries", podEntries, "object");
  return Object.fromEntries(
    Object.entries(podEntries).map(([name, podValue]) => [
      checkPODName(name),
      podValueToJSON(podValue, name)
    ])
  );
}

/**
 * Converts a {@link PODValue} from the TypeScript format used internally, into
 * a JSON-compatible format safe to serialize with `JSON.stringify`.  This
 * function will produce the simplest of the available encodings which can
 * represent the input with no loss value or type information.
 *
 * @param podValue the POD entries to convert
 * @param nameForErrorMessages an optional name for this value to be used
 *   in error messages
 * @returns a JSON-compatible representation
 * @throws TypeError if the input entries are not validly formed
 */
export function podValueToJSON(
  podValue: PODValue,
  nameForErrorMessages?: string
): JSONPODValue {
  nameForErrorMessages = nameForErrorMessages || "(unnamed)";
  podValue = checkPODValue(nameForErrorMessages, podValue);
  switch (podValue.type) {
    case "string":
      return podValue.value;
    case "int":
      const numValue = bigintToSimplestJSON(podValue.value);
      if (typeof numValue === "number") {
        return numValue;
      }
      return { int: numValue };
    case "cryptographic":
      return { cryptographic: bigintToSimplestJSON(podValue.value) };
    case "eddsa_pubkey":
      return { eddsa_pubkey: podValue.value };
    default:
      throw TypeError(
        `Value ${nameForErrorMessages} has unhandled POD value ` +
          // @ts-expect-error podValue is of type `never` if we've covered all types
          `type '${podValue.type}'.`
      );
  }
}

/**
 * Converts a bigint to the simplest value-preserving JSON value available.
 * There is no type information included.  The output is always a number
 * (with no fractional part) or a string which can be parsed by `BigInt(s)`.
 *
 * Numbers are used preferentially for values in the range between
 * `Number.MIN_SAFE_INTEGER` and `Number.MAX_SAFE_INTEGER` where no accuracy
 * is lost.  Stringified values may be hex or decimal encoded for minimal size.
 *
 * Note that this function doesn't enforce any bounds on the input.  Any
 * bigint will be encoded, even if it's not a valid POD value.
 *
 * @param n the input integer
 * @returns a number or string representing this integer.
 */
export function bigintToSimplestJSON(n: bigint): number | string {
  // For values which are in range for a JSON number (2^53), use that.
  if (n <= Number.MAX_SAFE_INTEGER && n >= Number.MIN_SAFE_INTEGER) {
    return Number(n);
  }

  // Large positive values are shorter as hex than decimal.
  // MAX_SAFE_INTEGER is large enough to be equal size even with the addition of
  // "0x", and the benefits become greater for larger values.
  if (n > 0) {
    return "0x" + n.toString(16);
  }

  // BigInt/Number parsing doesn't support hex for negative values, so
  // use decimal rather than having to write special numeric parsing.
  return n.toString();
}
