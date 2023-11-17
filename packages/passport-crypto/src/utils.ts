import { Buffer } from "buffer";
import sodium from "libsodium-wrappers-sumo";

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
 * Returns built in crypto if available, otherwise polyfill
 */
export function getCrypto(): any {
  const g = globalThis as any;
  if (g.crypto) {
    return g.crypto;
  } else {
    return require("crypto");
  }
}

/**
 * Determines whether we are in an Internet Explorer or Edge environment
 */
export function ieOrEdge(): boolean {
  return (
    (typeof document !== "undefined" && !!(document as any).documentMode) ||
    /Edge/.test(navigator.userAgent)
  );
}

/**
 * Returns true if WebCrypto is available
 */
export function isWebCryptoAvailable(): boolean {
  return !ieOrEdge() && getCrypto().crypto && !!getCrypto().crypto.subtle;
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
