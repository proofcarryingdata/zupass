import { Buffer } from "buffer";
import { parse as uuidParse, stringify as uuidStringify } from "uuid";

/**
 * Converts a byte array to a hex string.  Opposite of fromHexString().
 */
export function toHexString(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/**
 * Converts a hex string to a byte-array.  Opposite of toHexString().
 */
export function fromHexString(hexString: string): Buffer {
  return Buffer.from(hexString, "hex");
}

/**
 * Converts a number (as decimal string) to a UUID (as string) in the
 * format of uuid.stringify.
 */
export function decStringToBigIntToUuid(value: string): string {
  let hexStr = BigInt(value).toString(16);
  while (hexStr.length < 32) hexStr = "0" + hexStr;
  const buf = Buffer.from(hexStr, "hex");
  return uuidStringify(buf);
}

/**
 * Converts a UUID string into a bigint.
 */
export function uuidToBigInt(v: string): bigint {
  // a uuid is just a particular representation of 16 bytes
  const bytes = uuidParse(v);
  const hex = "0x" + Buffer.from(bytes).toString("hex");
  return BigInt(hex);
}

/**
 * Converts a native number to a bigint.
 */
export function numberToBigInt(v: number): bigint {
  return BigInt(v);
}

/**
 * Converts a hex number to a bigint.
 */
export function hexToBigInt(v: string): bigint {
  if (!v.startsWith("0x")) {
    v = "0x" + v;
  }

  return BigInt(v);
}

/**
 * Converts a boolean to a bigint value of 0 or 1.
 */
export function booleanToBigInt(v: boolean): bigint {
  return BigInt(v ? 1 : 0);
}

export function bigIntToBase64(bn: bigint): string {
  // source: https://coolaj86.com/articles/bigints-and-base64-in-javascript/
  let hex = BigInt(bn).toString(16);
  if (hex.length % 2) {
    hex = "0" + hex;
  }

  const bin = [];
  let i = 0;
  let d;
  let b;
  while (i < hex.length) {
    d = parseInt(hex.slice(i, i + 2), 16);
    b = String.fromCharCode(d);
    bin.push(b);
    i += 2;
  }

  return btoa(bin.join(""));
}

export function base64ToBigInt(b64: string): bigint {
  const bin = atob(b64);
  const hex: string[] = [];

  bin.split("").forEach(function (ch) {
    let h = ch.charCodeAt(0).toString(16);
    if (h.length % 2) {
      h = "0" + h;
    }
    hex.push(h);
  });

  return BigInt("0x" + hex.join(""));
}
