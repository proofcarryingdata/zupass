/**
 * Encoding of -1 in a Baby Jubjub field element (as p-1).
 */
export const babyJubNegativeOne = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495616"
);

/**
 * Determines whether a given number (as decimal string) represents -1,
 * either directly, or via a value of p-1 in a Baby Jubjub field.
 *
 * @param value integer encoded in a string
 */
export const babyJubIsNegativeOne = (value: string) =>
  BigInt(value) === babyJubNegativeOne || BigInt(value) === BigInt(-1);
