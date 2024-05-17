import { Point } from "@zk-kit/baby-jubjub";
import {
  derivePublicKey,
  packPublicKey,
  unpackPublicKey
} from "@zk-kit/eddsa-poseidon";
import {
  BigNumber,
  bigIntToHexadecimal,
  bufferToHexadecimal,
  hexadecimalToBigInt,
  hexadecimalToBuffer,
  leBigIntToBuffer,
  leBufferToBigInt
} from "@zk-kit/utils";

/**
 * Public keys are 32 bytes (a packed elliptic curve point), represented as 64
 * hex digits.
 * @todo support base64?
 */
const PUBLIC_KEY_REGEX = new RegExp(/^[0-9A-Fa-f]{64}$/);

/**
 * An EdDSA public key is represented as a point on the elliptic curve, with each point being
 * a pair of coordinates consisting of hexadecimal strings. The public key is maintained in a standard
 * format and is internally converted to and from the Montgomery format as needed.
 * @todo update comment above
 */
export type EdDSAPublicKey = [string, string] | string;

/**
 * Compares two {@link EdDSAPublicKey}s for equality.
 */
export function isEqualEdDSAPublicKey(
  a: EdDSAPublicKey,
  b: EdDSAPublicKey
): boolean {
  // @todo normalize to canonical form for comparison?
  if (typeof a === "string" && typeof b === "string") {
    return a === b;
  } else if (a instanceof Array && b instanceof Array) {
    return a[0] === b[0] && a[1] === b[1];
  } else {
    if (typeof a === "string") {
      // `b` must be a two-member array of hex strings
      const unpackedPublicKey = publicKeyToPoint(b);
      return a === encodePublicKey(unpackedPublicKey);
    } else {
      // `a` must be a two-member array of hex strings and `b` must be a string
      const unpackedPublicKey = publicKeyToPoint(a);
      return b === encodePublicKey(unpackedPublicKey);
    }
  }
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
  // @todo accept old format?
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
 * Checks if a value is a valid {@link EdDSAPublicKey}.
 */
export function isEdDSAPublicKey(
  maybeKey: unknown
): maybeKey is EdDSAPublicKey {
  if (
    maybeKey instanceof Array &&
    maybeKey.length === 2 &&
    typeof maybeKey[0] === "string" &&
    typeof maybeKey[1] === "string" &&
    !isNaN(Number("0x" + maybeKey[0])) &&
    !isNaN(Number("0x" + maybeKey[1]))
  ) {
    return true;
  } else if (typeof maybeKey === "string") {
    try {
      checkPublicKeyFormat(maybeKey);
      return true;
    } catch (_e) {
      return false;
    }
  } else {
    return false;
  }
}

/**
 * Converts a public key of either format to a {@link Point}, which is a
 * two-element array of bigints.
 */
export function publicKeyToPoint(pubKey: EdDSAPublicKey): Point<bigint> {
  if (typeof pubKey === "string") {
    return decodePublicKey(pubKey);
  } else {
    return [hexadecimalToBigInt(pubKey[0]), hexadecimalToBigInt(pubKey[1])];
  }
}

/**
 * Converts a public key of either format to array format.
 */
export function publicKeyToArrayFormat(pubKey: EdDSAPublicKey): EdDSAPublicKey {
  const point = publicKeyToPoint(pubKey);
  return [bigIntToHexadecimal(point[0]), bigIntToHexadecimal(point[1])];
}

/**
 * Decodes a public key packed by {@encodePublicKey}.  The input must be
 * 32 bytes, represented as 64 hex digits.
 *
 * @throws TypeError if the public key format is incorrect.
 */
export function decodePublicKey(publicKey: string): Point<bigint> {
  const rawPublicKey = unpackPublicKey(
    leBufferToBigInt(hexadecimalToBuffer(checkPublicKeyFormat(publicKey)))
  );
  if (rawPublicKey === null) {
    throw new TypeError(`Invalid packed public key point ${publicKey}.`);
  }
  return rawPublicKey;
}

/**
 * Encodes an EdDSA public key into a compact string represenation.  The output
 * is 32 bytes, represented as 64 hex digits.
 */
export function encodePublicKey(rawPublicKey: Point<BigNumber>): string {
  return bufferToHexadecimal(leBigIntToBuffer(packPublicKey(rawPublicKey), 32));
}

/**
 * Returns an {@link EdDSAPublicKey} derived from a 32-byte EdDSA private key.
 * The private key must be a hexadecimal string or a Uint8Array typed array.
 * @param privateKey The 32-byte EdDSA private key.
 * @returns The {@link EdDSAPublicKey} extracted from the private key.
 */
export async function getEdDSAPublicKey(
  privateKey: string | Uint8Array
): Promise<EdDSAPublicKey> {
  if (typeof privateKey === "string") {
    privateKey = hexadecimalToBuffer(privateKey);
  }

  const unpackedPublicKey = derivePublicKey(privateKey);
  return encodePublicKey(unpackedPublicKey);
}
