/**
 * Reusable type for a circuit signal (input or output) which can be a
 * bigint or a stringified bigint.  The specific type incantation here is based
 * on what's used in SnarkJS and CircomKit.
 */
export type CircuitSignal = `${number}` | bigint;
