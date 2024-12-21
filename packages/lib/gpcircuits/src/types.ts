/**
 * Reusable type for a circuit signal (input or output) which can be a
 * bigint or a stringified bigint.  The specific type incantation here is based
 * on what's used in SnarkJS and CircomKit.
 */
export type CircuitSignal = `${number}` | bigint;

/**
 * Paths to circuit artifacts (files) required for proving and verifying.
 */
export type CircuitArtifactPaths = {
  /**
   * path to wasm file for witness generation.
   */
  wasmPath: string;

  /**
   * path to JSON file containing the proving key.
   */
  pkeyPath: string;

  /**
   * path to JSON file containing the verification key.
   */
  vkeyPath: string;
};

/**
 * Base type for a description of single circuit in any family.
 * Each family can define its own extensions to this type.
 */
export type CircuitDesc = {
  /**
   * Circuit family name.
   */
  family: string;

  /**
   * This circuit's name, which is the base name for artifact files.
   */
  name: string;

  /**
   * Number of non-linear constraints, used as a proxy for performance cost.
   */
  cost: number;
};
