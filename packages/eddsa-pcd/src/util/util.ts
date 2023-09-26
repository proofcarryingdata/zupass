import * as ed from "noble-ed25519";

/**
 * Create a new EdDSA private key.
 * 
 * @returns an EdDSA private key as hexadecimal string.
 */
export function newEdDSAPrivateKey(): string {
  return Buffer.from(ed.utils.randomPrivateKey()).toString("hex");
}
