import { r as BabyJubjubR } from "@zk-kit/baby-jubjub";

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
export type POD_VALUE_STRING_TYPE_IDENTIFIER = "eddsa_pubkey" | "string";

/**
 * Identifier for EdDSA public key string type.
 */
export const EDDSA_PUBKEY_TYPE_STRING = "eddsa_pubkey";

/**
 * Regex matching legal values for types encoded as strings by
 * {@link podValueToRawValue}. This matches strings of the form
 * `pod_${PODName}:${string}`.
 */
export const POD_STRING_TYPE_REGEX = new RegExp(/pod_([A-Za-z_]\w*):(.*)$/);

/**
 * POD value for a user-specififed string.  String values can contain any
 * string.  They are not limited like names.
 */
export type PODStringValue = {
  type: "string";
  value: string;
};

/**
 * POD value for unconstrained integer values such as hashes.  These can be
 * any value which fits into a circuit signal.  The constants
 * POD_CRYPTOGRAPHIC_MIN and POD_CRYPTOGRAPHIC_MAX specify the legal range.
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
export const POD_CRYPTOGRAPHIC_MAX = BabyJubjubR - 1n;

/**
 * POD value for constrained integer values intended for comparison and
 * arithmatic manipulation.  The constants POD_INT_MIN and POD_INT_MAX specify
 * the legal range.
 *
 * `int` values are currently 63-bit unsigned values, but will probably become
 * signed values in a future update.
 */
export type PODIntValue = {
  type: "int";
  value: bigint;
};

// TODO(POD-P3): Decide on default int bounds and sign for POD.
// These values limit ints to 63 bits unsigned, to leave room if we
// decide on 64-bit signed later.

/**
 * Minimum legal value of an `int` entry value.
 */
export const POD_INT_MIN = 0n;

/**
 * Maximum legal value of an `int` entry value.
 */
export const POD_INT_MAX = (1n << 63n) - 1n;

/**
 * POD value for EdDSA (Baby Jubjub) public keys. Such a value is represented as
 * a hex string of the (32-byte) encoded form of the key.
 */
export type PODEdDSAPublicKeyValue = {
  type: "eddsa_pubkey";
  value: string;
};

/**
 * POD values are tagged with their type.  All values contain `type` and `value`
 * fields, which Typescript separates into distinct types for validation.
 */
export type PODValue =
  | PODStringValue
  | PODCryptographicValue
  | PODIntValue
  | PODEdDSAPublicKeyValue;

/**
 * Represents a tuple of POD values as an array.
 */
export type PODValueTuple = PODValue[];

/**
 * POD raw values are simply unwrapped POD values.
 */
export type PODRawValue = string | bigint;

/**
 * Represents a tuple of POD raw values as an array.
 */
export type PODRawValueTuple = PODRawValue[];

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
