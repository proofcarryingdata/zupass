import { getRandomValues, toHexString } from "@pcd/util";
import { EdDSAPublicKey } from "../EdDSAPCD.js";

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
  return a[0] === b[0] && a[1] === b[1];
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
  } else {
    return false;
  }
}
