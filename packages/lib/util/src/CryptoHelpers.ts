import nodeCrypto from "crypto";
import { isBrowser, isNode } from "./Environment";

// The 'crypto' variable provides access to the functions defined
// in the standard Web Crypto API (https://www.w3.org/TR/WebCryptoAPI).
let crypto: Crypto | undefined;

/**
 * Initialize the 'crypto' variable with an implementation that
 * is compatible with the Web Crypto API standard in both
 * browser and Node.js environments, requiring no additional
 * polyfills or code.
 * This code is compatible with Node.js < v18 too.
 */
function initCryptoAPI(): Crypto {
  if (!crypto) {
    if (isBrowser()) {
      crypto = globalThis.crypto;
    } else if (isNode()) {
      crypto = nodeCrypto.webcrypto as Crypto;
    } else {
      throw new Error("Crypto API is not defined");
    }
  }

  return crypto;
}

/**
 * Provide cryptographically strong random values.
 * @param numberOfBytes Number of bytes of the random value.
 * @returns Random value.
 */
export function getRandomValuesOfLength(numberOfBytes: number): Uint8Array {
  return getRandomValues(new Uint8Array(numberOfBytes));
}
