import { getRandomValues, toHexString } from "@pcd/util";

/**
 * Create a new EdDSA private key.
 * 
 * @returns an EdDSA private key as hexadecimal string.
 */
export function newEdDSAPrivateKey(): string {
  return toHexString(getRandomValues(32));
}
