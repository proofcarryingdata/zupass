import JSONBig from "json-bigint";
import {
  checkBoundConfig,
  checkProofConfig,
  checkRevealedClaims
} from "./gpcChecks";
import { GPCBoundConfig, GPCProofConfig, GPCRevealedClaims } from "./gpcTypes";

const jsonBigSerializer = JSONBig({
  useNativeBigInt: true,
  alwaysParseAsBig: true
});

/**
 * Serializes `GPCProofConfig` to a string in a full-fidelity format.  Calling
 * {@link deserializeGPCProofConfig} will reconstruct the same object.
 *
 * @param toSerialize the GPCProofConfig to serialize
 * @param space pretty-printing configuration, as defined by the corresponding
 *   argument to JSON.stringify.
 * @returns a string representation
 */
export function serializeGPCProofConfig(
  toSerialize: GPCProofConfig,
  space?: number
): string {
  return jsonBigSerializer.stringify(toSerialize, null, space);
}

/**
 * Deserializes `GPCProofConfig` from the full-fidelity format produced by
 * {@link serializeGPCProofConfig}, and checks the validity of the
 * configuration.
 *
 * @param serialized a string representation of `GPCProofConfig`
 * @returns `GPCProofConfig` deserialized from the string
 * @throws TypeError if the serialized form is invalid
 */
export function deserializeGPCProofConfig(serialized: string): GPCProofConfig {
  const deserialized = jsonBigSerializer.parse(serialized);
  // TODO(POD-P2): Consider separating these steps to allow deserializing without checking.
  checkProofConfig(deserialized);
  return deserialized;
}

/**
 * Serializes `GPCBoundConfig` to a string in a full-fidelity format.  Calling
 * {@link deserializeGPCBoundConfig} will reconstruct the same object.
 *
 * @param toSerialize the GPCProofConfig to serialize
 * @param space pretty-printing configuration, as defined by the corresponding
 *   argument to JSON.stringify.
 * @returns a string representation
 */
export function serializeGPCBoundConfig(
  toSerialize: GPCBoundConfig,
  space?: number
): string {
  return jsonBigSerializer.stringify(toSerialize, null, space);
}

/**
 * Deserializes `GPCBoundConfig` from the full-fidelity format produced by
 * {@link serializeGPCBoundConfig}, and checks the validity of the
 * configuration.
 *
 * @param serialized a string representation of `GPCBoundConfig`
 * @returns `GPCBoundConfig` deserialized from the string
 * @throws TypeError if the serialized form is invalid
 */
export function deserializeGPCBoundConfig(serialized: string): GPCBoundConfig {
  const deserialized = jsonBigSerializer.parse(serialized);
  // TODO(POD-P2): Consider separating these steps to allow deserializing without checking.
  checkBoundConfig(deserialized);
  return deserialized;
}

/**
 * Serializes `GPCRevealedClaims` to a string in a full-fidelity format.
 * Calling {@link deserializeGPCRevealedClaims} will reconstruct the same
 * object.
 *
 * @param toSerialize the GPCRevealedClaims to serialize
 * @param space pretty-printing configuration, as defined by the corresponding
 *   argument to JSON.stringify.
 * @returns a string representation
 */
export function serializeGPCRevealedClaims(
  toSerialize: GPCRevealedClaims,
  space?: number
): string {
  return jsonBigSerializer.stringify(toSerialize, null, space);
}

/**
 * Deserializes `GPCRevealedClaims` from the full-fidelity format produced by
 * {@link serializeGPCRevealedClaims}, and checks the validity of the
 * claims.
 *
 * @param serialized a string representation of `GPCRevealedClaims`
 * @returns `GPCRevealedClaims` deserialized from the string
 * @throws TypeError if the serialized form is invalid
 */
export function deserializeGPCRevealedClaims(
  serialized: string
): GPCRevealedClaims {
  const deserialized = jsonBigSerializer.parse(serialized);
  // TODO(POD-P2): Consider separating these steps to allow deserializing without checking.
  checkRevealedClaims(deserialized);
  return deserialized;
}
