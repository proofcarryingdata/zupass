import { sha256 } from "js-sha256";

/**
 * Baby Jubjub prime, i.e. the order of the Baby Jubjub base field, which is the
 * order of the BN254 scalar field.
 */
export const BABY_JUB_PRIME = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

/**
 * Encoding of -1 in the Baby Jubjub base field (as p-1).
 */
export const BABY_JUB_NEGATIVE_ONE = BABY_JUB_PRIME - 1n;

/**
 * Encoding of -1 in the Baby Jubjub 251-bit prime order subgroup's scalar
 * field (as subgroupOrder-1).
 */
export const BABY_JUB_SUBGROUP_ORDER_MINUS_ONE = BigInt(
  "2736030358979909402780800718157159386076813972158567259200215660948447373040"
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
