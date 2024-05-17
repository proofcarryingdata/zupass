import { getRandomValues, toHexString } from "@pcd/util";

/**
 * Creates a new EdDSA private key generating a cryptographically strong random 32-byte value.
 */
export function newEdDSAPrivateKey(): string {
  return toHexString(getRandomValues(32));
}
