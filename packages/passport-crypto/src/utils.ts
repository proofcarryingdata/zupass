import { Buffer } from "buffer";
import {
  base64_variants,
  from_base64,
  from_hex,
  from_string,
  to_base64,
  to_hex,
  to_string,
} from "libsodium-wrappers";

declare global {
  interface Document {
    documentMode?: string;
  }
  interface Window {
    msCrypto?: Crypto;
  }
}

/**
 * Returns `window` if available, or `global` if supported in environment.
 */
export function getGlobalScope(): Window & typeof globalThis {
  return window;
}

/**
 * Determines whether we are in an Internet Explorer or Edge environment
 * @access public
 */
export function ieOrEdge(): boolean {
  return (
    (typeof document !== "undefined" && !!document.documentMode) ||
    /Edge/.test(navigator.userAgent)
  );
}

/**
 * Returns true if WebCrypto is available
 * @access public
 */
export function isWebCryptoAvailable(): boolean {
  return (
    !ieOrEdge() && getGlobalScope().crypto && !!getGlobalScope().crypto.subtle
  );
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
 * @access public
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
