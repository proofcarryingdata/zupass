import secureRandom from "secure-random";

/**
 * Provide cryptographically strong random values.
 * @param numberOfBytes Number of bytes of the random value.
 * @returns Random value.
 */
export function getRandomValues(numberOfBytes: number): Uint8Array {
  // const crypto = initCryptoAPI();
  return secureRandom(numberOfBytes, { type: "Uint8Array" });
  // return crypto.getRandomValues(new Uint8Array(numberOfBytes));
}
