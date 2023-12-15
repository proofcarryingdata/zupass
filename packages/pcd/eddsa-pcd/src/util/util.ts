import { getRandomValues, toHexString } from "@pcd/util";
import { EdDSAPublicKey } from "../EdDSAPCD";

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
