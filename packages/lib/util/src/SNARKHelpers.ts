import { sha256 } from "js-sha256";

/**
 * Encoding of -1 in a Baby Jubjub field element (as p-1).
 */
export const BABY_JUB_NEGATIVE_ONE = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495616"
);

/**
 * Determines whether a given number (as decimal string) represents -1,
 * either directly, or via a value of p-1 in a Baby Jubjub field.
 *
 * @param value integer encoded in a string
 */
export function babyJubIsNegativeOne(value: string): boolean {
  const bigintValue = BigInt(value);
  return bigintValue === BABY_JUB_NEGATIVE_ONE || bigintValue === BigInt(-1);
}
/**
 * Hashes a message to be signed with sha256 and truncates to fit into a
 * baby jub jub field element.  The result includes the top 248 bits of
 * the 256 bit hash.
 *
 * @param signal The initial message.
 * @returns The outputted hash, fed in as a signal to the Semaphore proof.
 */
export function generateSnarkMessageHash(signal: string | undefined): bigint {
  // right shift to fit into a field element, which is 254 bits long
  // shift by 8 ensures we have a 253 bit element
  return BigInt("0x" + sha256(signal ?? "")) >> 8n;
}
