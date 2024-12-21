/**
 * Name of a POD entry is a string with a limited character set, checked using
 * {@link POD_NAME_REGEX}.
 */
export type PODName = string;

/**
 * Regex matching legal names for POD entries.  This is intended to make
 * entry names usable as identifiers in TypeScript and other languages.
 */
export const POD_NAME_REGEX = new RegExp(/^[A-Za-z_]\w*$/);

/**
 * String-encoded POD value type enum.
 */
export type POD_VALUE_STRING_TYPE_IDENTIFIER =
  | typeof EDDSA_PUBKEY_TYPE_STRING
  | "string";

/**
 * Identifier for EdDSA public key string type.
 */
export const EDDSA_PUBKEY_TYPE_STRING = "eddsa_pubkey";

/**
 * POD value for a user-specififed string.  String values can contain any
 * string.  They are not limited like names.
 *
 * Strings are represented in circuits by their hash.  They can be compared for
 * equality but not subjected to arithmetic or inequality comparisons.
 */
export type PODStringValue = {
  type: "string";
  value: string;
};

/**
 * POD vaue for bytes of binary data of any size.
 *
 * Like strings, bytes are represented in circuits by their hash.  They are
 * hashed in the same way as strings, so a string with the same encoding
 * can be considered equal to a bytes value.
 */
export type PODBytesValue = {
  type: "bytes";
  value: Uint8Array;
};

/**
 * POD value for unconstrained integer values such as hashes.  These can be
 * any value which fits into a circuit signal.  The constants
 * POD_CRYPTOGRAPHIC_MIN and POD_CRYPTOGRAPHIC_MAX specify the legal range.
 *
 * Cryptographic values are numeric, but can be compared only for equality,
 * not subjected to arithmetic manipulation or inequality comparisons.
 */
export type PODCryptographicValue = {
  type: "cryptographic";
  value: bigint;
};

/**
 * Minimum legal value of a `cryptographic` entry value.
 */
export const POD_CRYPTOGRAPHIC_MIN = 0n;

/**
 * Maximum legal value of a `cryptographic` entry value.
 */
export const POD_CRYPTOGRAPHIC_MAX =
  // Prime order of the alt_bn128 curve.
  // Should always be equal to the `r` constant in @zk-kit/baby-jubjub.
  21888242871839275222246405745257275088548364400416034343698204186575808495617n -
  1n;

/**
 * POD value for constrained integer values intended for inequality comparison
 * and arithmetic manipulation.  The constants {@link POD_INT_MIN} and
 * {@link POD_INT_MAX} specify the legal range.
 *
 * `int` values are 64-bit signed values. Note that this is the same range as
 * the two's complement representation of 64-bit signed numbers on most
 * platforms.
 */
export type PODIntValue = {
  type: "int";
  value: bigint;
};

/**
 * Minimum legal value of an `int` entry value.
 */
export const POD_INT_MIN = -(1n << 63n);

/**
 * Maximum legal value of an `int` entry value.
 */
export const POD_INT_MAX = (1n << 63n) - 1n;

/**
 * POD value for a boolean true/false.  Boolean values are cryptographically
 * identical to "int" values with the value 0 or 1, but distinguished for
 * readability and ease of use.
 */
export type PODBooleanValue = {
  type: "boolean";
  value: boolean;
};

/**
 * POD value for EdDSA (Baby Jubjub) public keys. Such a value is represented as
 * a hex string of the (32-byte) encoded form of the key.
 */
export type PODEdDSAPublicKeyValue = {
  type: typeof EDDSA_PUBKEY_TYPE_STRING;
  value: string;
};

/**
 * Type constructor for EdDSA (Baby Jubjub) public keys.
 */
export function PODEdDSAPublicKeyValue(value: string): PODEdDSAPublicKeyValue {
  return { type: EDDSA_PUBKEY_TYPE_STRING, value };
}

/**
 * POD value for a point in time, defined by a date and timestamp in UTC
 * accurate to the millisecond.  Time values are represented cryptographically
 * by a signed integer counting milliseconds before/after the epoch
 * (Jan 1 1970 in UTC time), which can be subject to comparison and arithmetic
 * manipulation.
 *
 * The numeric representation of a time value is a signed integer, with
 * the same represenation and capabilities as {@link PODIntValue}.  The range
 * of values is constrained to the limits of the JavaScript Date type, as
 * defined by the constants {@link POD_DATE_MIN} and {@link POD_DATE_MAX}.
 */
export type PODDateValue = {
  type: "date";
  value: Date;
};

/**
 * Minimum legal value of a `date` entry value.
 */
export const POD_DATE_MIN = new Date(-8_640_000_000_000_000);

/**
 * Maximum legal value of a `date` entry value.
 */
export const POD_DATE_MAX = new Date(8_640_000_000_000_000);

/**
 * POD value for null, to act a placeholder for entries not given a value.
 *
 * Since circuits cannot prove the absence of a POD entry, null values can be
 * used to provably provide no value in an entry.  Null values have no
 * numeric value, and thus cannot be involved in inequality comparisons or
 * arithmetic.
 */
export type PODNullValue = { type: "null"; value: null };

/**
 * Convenience constant for a null PODValue.  Note that since users are not
 * required to use this constant, PODNullValues should not be compared using
 * `===`, but by examining the type or value fields.
 */
export const PODNull: PODNullValue = { type: "null", value: null };

/**
 * Fixed hash value representing a PODNullValue in a circuit.
 */
export const POD_NULL_HASH =
  0x1d1d1d1d1d1d1d1d_1d1d1d1d1d1d1d1d_1d1d1d1d1d1d1d1d_1d1d1d1d1d1d1d1dn;

/**
 * POD values are tagged with their type.  All values contain `type` and `value`
 * fields, which Typescript separates into distinct types for validation.
 */
export type PODValue =
  | PODStringValue
  | PODBytesValue
  | PODCryptographicValue
  | PODIntValue
  | PODBooleanValue
  | PODEdDSAPublicKeyValue
  | PODDateValue
  | PODNullValue;

/**
 * Represents a tuple of POD values as an array.
 */
export type PODValueTuple = PODValue[];

/**
 * A set of entries defining a POD, represented in an object.  POD entries
 * are always Merklized in sorted order.  Entries extracted from a `POD`
 * instance will always iterate in sorted order, but inputs used to create
 * a new POD need not be sorted beforehand.
 *
 * The type system isn't restrictive enough to guarantee that any `PODEntries`
 * object is valid, but constructing a `POD` or `PODContent` object will
 * ensure all entries are valid.
 */
export type PODEntries = Record<PODName, PODValue>;
