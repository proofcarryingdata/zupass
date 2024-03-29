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
 * Serializes GPCProofConfig to a string in a full-fidelity format.  Calling
 * {@link deserializePODEntries} will reconstruct the same `PODEntries`
 * including their type information.
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
 * Deserializes `PODEntries` from the full-fidelity format produced by
 * {@link serializePODEntries}.
 *
 * @param serialized a string representation of `GPCProofConfig`
 * @returns `GPCProofConfig` deserialized from the string
 * @throws TypeError if the serialized form is invalid
 */
export function deserializeGPCProofConfig(serialized: string): GPCProofConfig {
  const deserialized = jsonBigSerializer.parse(serialized);
  checkProofConfig(deserialized);
  return deserialized;
}

/**
 * Serializes GPCBoundConfig to a string in a full-fidelity format.  Calling
 * {@link deserializePODEntries} will reconstruct the same `PODEntries`
 * including their type information.
 *
 * @param toSerialize the GPCBoundConfig to serialize
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
 * Deserializes `PODEntries` from the full-fidelity format produced by
 * {@link serializePODEntries}.
 *
 * @param serialized a string representation of `GPCBoundConfig`
 * @returns `GPCBoundConfig` deserialized from the string
 * @throws TypeError if the serialized form is invalid
 */
export function deserializeGPCBoundConfig(serialized: string): GPCBoundConfig {
  const deserialized = jsonBigSerializer.parse(serialized);
  checkBoundConfig(deserialized);
  return deserialized;
}

/**
 * Serializes GPCRevealedClaims to a string in a full-fidelity format.  Calling
 * {@link deserializePODEntries} will reconstruct the same `PODEntries`
 * including their type information.
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
 * Deserializes `PODEntries` from the full-fidelity format produced by
 * {@link serializePODEntries}.
 *
 * @param serialized a string representation of `GPCRevealedClaims`
 * @returns `GPCRevealedClaims` deserialized from the string
 * @throws TypeError if the serialized form is invalid
 */
export function deserializeGPCRevealedClaims(
  serialized: string
): GPCRevealedClaims {
  const deserialized = jsonBigSerializer.parse(serialized);
  checkRevealedClaims(deserialized);
  return deserialized;
}
