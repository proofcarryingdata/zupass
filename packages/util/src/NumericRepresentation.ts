import { stringify } from "uuid";
import { sha256 } from "js-sha256";

/**
 * Converts a byte array to a hex string.  Opposite of fromHexString().
 */
export function toHexString(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/**
 * Converts a hex string to a byte-array.  Opposite of toHexString().
 */
export function fromHexString(hexString: string): Uint8Array {
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
  return stringify(buf);
}

/**
 * Hashes a message to be signed with sha256 and fits it into a baby jub jub field element.
 * @param signal The initial message.
 * @returns The outputted hash, fed in as a signal to the Semaphore proof.
 */
export function generateMessageHash(signal: string): bigint {
  // right shift to fit into a field element, which is 254 bits long
  // shift by 8 ensures we have a 253 bit element
  return BigInt("0x" + sha256(signal)) >> BigInt(8);
}
