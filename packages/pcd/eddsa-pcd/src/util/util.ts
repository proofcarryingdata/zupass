import { fromHexString, getRandomValues, toHexString } from "@pcd/util";
import { Point } from "@zk-kit/baby-jubjub";
import { packPublicKey, unpackPublicKey } from "@zk-kit/eddsa-poseidon";
import {
  BigNumber,
  hexadecimalToBigInt,
  leBigIntToBuffer,
  leBufferToBigInt
} from "@zk-kit/utils";
import { EdDSAPublicKey } from "../EdDSAPCD";

/**
 * Public keys are 32 bytes (a packed elliptic curve point), represented as 64
 * hex digits.
 */
const PUBLIC_KEY_REGEX = new RegExp(/^[0-9A-Fa-f]{64}$/);

/**
 * Creates a new EdDSA private key generating a cryptographically strong random 32-byte value.
 */
export function newEdDSAPrivateKey(): string {
  return toHexString(getRandomValues(32));
}

/**
 * Compares two EdDSA public keys for equality.
 */
export function isEqualEdDSAPublicKey(
  a: EdDSAPublicKey,
  b: EdDSAPublicKey
): boolean {
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
 * Checks if a value is a valid EdDSAPublicKey
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

export function publicKeyToPoint(pubKey: EdDSAPublicKey): Point<bigint> {
  if (typeof pubKey === "string") {
    return decodePublicKey(pubKey);
  } else {
    return [hexadecimalToBigInt(pubKey[0]), hexadecimalToBigInt(pubKey[1])];
  }
}

/**
 * Decodes a public key packed by {@encodePublicKey}.  The input must be
 * 32 bytes, represented as 64 hex digits.
 *
 * @throws TypeError if the public key format is incorrect.
 */
export function decodePublicKey(publicKey: string): Point<bigint> {
  const rawPublicKey = unpackPublicKey(
    leBufferToBigInt(fromHexString(checkPublicKeyFormat(publicKey)))
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
  return toHexString(leBigIntToBuffer(packPublicKey(rawPublicKey), 32));
}
