import sodium from "@pcd/libsodium-wrappers-sumo";
import { Buffer } from "buffer";
import nodeCrypto from "crypto";

// This is necessary as libsodium-wrappers-sumo is a CommonJS package and
// doesn't support importing individual items properly.
const {
  base64_variants,
  from_base64,
  from_string,
  to_base64,
  to_string,
  from_hex,
  to_hex
} = sodium;

/**
 * If in a web environment, return the global crypto object. If not, use the
 * imported crypto library, which will either be present as a NodeJS built-in,
 * or polyfilled by the final bundler.
 */
export function getCrypto(): Crypto {
  const g = globalThis;
  if (g.crypto) {
    return g.crypto;
  } else {
    return nodeCrypto.webcrypto as Crypto;
  }
}

/**
 * Converts a plain string into an ArrayBuffer
 * @param {string} string - A plain string
 */
export function stringToArrayBuffer(string: string): Uint8Array {
  return from_string(string);
}

/**
 * Converts an ArrayBuffer into a plain string
 * @param {ArrayBuffer} arrayBuffer
 */
export function arrayBufferToString(arrayBuffer: ArrayBuffer): string {
  return to_string(arrayBuffer as Uint8Array);
}

/**
 * Converts an ArrayBuffer into a hex string
 * @param arrayBuffer
 */
export function arrayBufferToHexString(arrayBuffer: ArrayBuffer): string {
  return to_hex(Buffer.from(arrayBuffer));
}

/**
 * Converts a hex string into an ArrayBuffer
 * @param hex - A hex string
 */
export function hexStringToArrayBuffer(hex: string): Uint8Array {
  return from_hex(hex);
}

/**
 * Converts a base64 string into an ArrayBuffer
 * @param base64 - A base64 string
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  return from_base64(base64, base64_variants.ORIGINAL);
}

/**
 * Converts an ArrayBuffer into a base64 string
 * @param buffer
 */
export function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  return to_base64(Buffer.from(arrayBuffer), base64_variants.ORIGINAL);
}

/**
 * Converts a hex string into a base64 string
 * @param hex - A hex string
 */
export function hexToBase64(hex: string): string {
  return to_base64(from_hex(hex), base64_variants.ORIGINAL);
}

/**
 * Converts a base64 string into a hex string
 * @param base64 - A base64 string
 */
export function base64ToHex(base64: string): string {
  return to_hex(from_base64(base64, base64_variants.ORIGINAL));
}
