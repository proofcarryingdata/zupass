import { Groth16Proof, groth16 } from "snarkjs";
import { CircuitDesc, CircuitSignal } from "./types";
import circuitParamJson from "./circuitParameters.json";

const PROTO_POD_GPC_FAMILY_NAME = "proto-pod-gpc";

/**
 * Full set of input signals to a ProtoPODGPC proof.  See comments for
 * annotations on array size and public signals.
 */
export type ProtoPODGPCInputs = {
  // Object modules [MAX_OBJECTS].
  objectContentID: CircuitSignal /*MAX_OBJECTS*/[];
  /*PUB*/ objectSignerPubkeyAx: CircuitSignal /*MAX_OBJECTS*/[];
  /*PUB*/ objectSignerPubkeyAy: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureR8x: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureR8y: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureS: CircuitSignal /*MAX_OBJECTS*/[];

  // Entry modules [MAX_ENTRIES].
  /*PUB*/ entryObjectIndex: CircuitSignal /*MAX_ENTRIES*/[];
  /*PUB*/ entryNameHash: CircuitSignal /*MAX_ENTRIES*/[];
  entryValue: CircuitSignal /*MAX_ENTRIES*/[];
  /*PUB*/ entryIsValueEnabled: CircuitSignal /*MAX_ENTRIES packed bits*/;
  /*PUB*/ entryIsValueHashRevealed: CircuitSignal /*MAX_ENTRIES packed bits*/;
  entryProofDepth: CircuitSignal /*MAX_ENTRIES*/[];
  entryProofIndex: CircuitSignal /*MAX_ENTRIES*/[] /*MERKLE_MAX_DEPTH packed bits*/;
  entryProofSiblings: CircuitSignal /*MAX_ENTRIES*/[] /*MERKLE_MAX_DEPTH*/[];

  // Entry constraint modules.
  /*PUB*/ entryEqualToOtherEntryByIndex: CircuitSignal /*MAX_ENTRIES*/[];

  // Owner module (1)
  /*PUB*/ ownerEntryIndex: CircuitSignal;
  ownerSemaphoreV3IdentityNullifier: CircuitSignal;
  ownerSemaphoreV3IdentityTrapdoor: CircuitSignal;
  /*PUB*/ ownerExternalNullifier: CircuitSignal;
  /*PUB*/ ownerIsNullfierHashRevealed: CircuitSignal;

  // Global module (1)
  /*PUB*/ globalWatermark: CircuitSignal;
};

/**
 * All input names, represented as a type, for use in circomkit utests.
 */
export type ProtoPODGPCInputNamesType = [
  "objectContentID",
  "objectSignerPubkeyAx",
  "objectSignerPubkeyAy",
  "objectSignatureR8x",
  "objectSignatureR8y",
  "objectSignatureS",
  "entryObjectIndex",
  "entryNameHash",
  "entryValue",
  "entryIsValueEnabled",
  "entryIsValueHashRevealed",
  "entryProofDepth",
  "entryProofIndex",
  "entryProofSiblings",
  "entryEqualToOtherEntryByIndex",
  "ownerEntryIndex",
  "ownerSemaphoreV3IdentityNullifier",
  "ownerSemaphoreV3IdentityTrapdoor",
  "ownerExternalNullifier",
  "ownerIsNullfierHashRevealed",
  "globalWatermark"
];

/**
 * Only the public inputs signals to a ProtoPODGPC proof.  See comments for
 * annotations on array size and public signals.
 */
export type ProtoPODGPCPublicInputs = {
  // Object modules [MAX_OBJECTS].
  /*PUB*/ objectSignerPubkeyAx: CircuitSignal /*MAX_OBJECTS*/[];
  /*PUB*/ objectSignerPubkeyAy: CircuitSignal /*MAX_OBJECTS*/[];

  // Entry modules [MAX_ENTRIES].
  /*PUB*/ entryObjectIndex: CircuitSignal /*MAX_ENTRIES*/[];
  /*PUB*/ entryNameHash: CircuitSignal /*MAX_ENTRIES*/[];
  /*PUB*/ entryIsValueEnabled: CircuitSignal /*MAX_ENTRIES packed bits*/;
  /*PUB*/ entryIsValueHashRevealed: CircuitSignal /*MAX_ENTRIES packed bits*/;

  // Entry constraint modules.
  /*PUB*/ entryEqualToOtherEntryByIndex: CircuitSignal /*MAX_ENTRIES*/[];

  // Owner module (1)
  /*PUB*/ ownerEntryIndex: CircuitSignal;
  /*PUB*/ ownerExternalNullifier: CircuitSignal;
  /*PUB*/ ownerIsNullfierHashRevealed: CircuitSignal;

  // Global module (1)
  /*PUB*/ globalWatermark: CircuitSignal;
};

/**
 * Only the public input names, as run-time data.
 */
export const PROTO_POD_GPC_PUBLIC_INPUT_NAMES = [
  "objectSignerPubkeyAx",
  "objectSignerPubkeyAy",
  "entryObjectIndex",
  "entryNameHash",
  "entryIsValueEnabled",
  "entryIsValueHashRevealed",
  "entryEqualToOtherEntryByIndex",
  "ownerEntryIndex",
  "ownerExternalNullifier",
  "ownerIsNullfierHashRevealed",
  "globalWatermark"
];

/**
 * All output signals from a ProtoPODGPC proof.  See comments for
 * annotations on array size and public signals.
 */
export type ProtoPODGPCOutputs = {
  entryRevealedValueHash: CircuitSignal /*MAX_ENTRIES*/[];
  ownerRevealedNulifierHash: CircuitSignal;
};

/**
 * Names of output signals from a ProtoPODGPC proof, represented as a type, for
 * use in circomkit utests.
 */
export type ProtoPODGPCOutputNamesType = [
  "entryRevealedValueHash",
  "ownerRevealedNulifierHash"
];

/**
 * Type containing proto POD GPC parameters.
 */
export type ProtoPODGPCParameters = {
  /**
   * Number of POD objects which can be included in a proof.
   */
  maxObjects: number;

  /**
   * Number of POD entries which can be included in a proof.
   */
  maxEntries: number;

  /**
   * Max depth of POD merkle tree.  Max entries in any object is log2(depth-1).
   */
  merkleMaxDepth: number;
};

/**
 * ProtoPODGPCParameter constructor.
 */
export function ProtoPODGPCParameters(
  maxObjects: number,
  maxEntries: number,
  merkleMaxDepth: number
): ProtoPODGPCParameters {
  return { maxObjects, maxEntries, merkleMaxDepth };
}

/**
 * Mapping taking a ProtoPODGPCParameter to its array representation.
 * This is necessary for invocations of the circuits themselves.
 */
export function protoPODGPCParameterArray(
  params: ProtoPODGPCParameters
): number[] {
  return [params.maxObjects, params.maxEntries, params.merkleMaxDepth];
}

/**
 * Circuit description with parameters specific to ProtoPODGPC family.
 */
export type ProtoPODGPCCircuitDesc = CircuitDesc & ProtoPODGPCParameters;

/**
 * Utility functions for the ProtoPODGPC family of circuits.
 *
 * TODO(POD-P3): Factor out and generalize if/when there are multiple
 * families and we're clear on what's common between them.
 */
export class ProtoPODGPC {
  /**
   * Generate a Groth16 proof for a circuit in this family.
   *
   * @param inputs full inputs (public and private)
   * @param wasmPath path to wasm file for witness generation.
   *   See {@link artifactPaths}.
   * @param pkeyPath path to file containing proving key.
   *   See {@link artifactPaths}.
   * @returns Groth16 proof, circuit outputs, and full set of public signals
   * (primarily for verification in tests).
   */
  public static async prove(
    inputs: ProtoPODGPCInputs,
    wasmPath: string,
    pkeyPath: string
  ): Promise<{
    proof: Groth16Proof;
    outputs: ProtoPODGPCOutputs;
    publicSignals: bigint[];
  }> {
    const { proof, publicSignals } = await groth16.fullProve(
      inputs,
      wasmPath,
      pkeyPath
    );
    const intPublicSignals = publicSignals.map(BigInt);

    const outputs = ProtoPODGPC.outputsFromPublicSignals(
      intPublicSignals,
      inputs.entryNameHash.length
    );
    return { proof, outputs, publicSignals: intPublicSignals };
  }

  /**
   * Verify a proof for a circuit in this library.
   *
   * @param vkey verification key imported from JSON file.
   *   See {@link artifactPaths}.
   * @param proof Groth16 proof.
   * @param publicInputs claimed public inputs to the circuit.
   *   See {@link filterPublicInputs}
   * @param outputs claimed outputs from the circuit (generally derived from
   *   claims).
   * @returns true if the proof is valid
   */
  public static async verify(
    vkey: object,
    proof: Groth16Proof,
    publicInputs: ProtoPODGPCPublicInputs,
    outputs: ProtoPODGPCOutputs
  ): Promise<boolean> {
    const publicSignals = ProtoPODGPC.makePublicSignals(publicInputs, outputs);
    return await groth16.verify(
      vkey,
      // Snarkjs actually allows bigints, but @types/snarkjs doesn't know that.
      publicSignals as unknown as string[],
      proof
    );
  }

  /**
   * Extract the public inputs from the full set of proof inputs.
   */
  public static filterPublicInputs(
    allInputs: ProtoPODGPCInputs
  ): ProtoPODGPCPublicInputs {
    return {
      objectSignerPubkeyAx: allInputs.objectSignerPubkeyAx,
      objectSignerPubkeyAy: allInputs.objectSignerPubkeyAy,
      entryObjectIndex: allInputs.entryObjectIndex,
      entryNameHash: allInputs.entryNameHash,
      entryIsValueEnabled: allInputs.entryIsValueEnabled,
      entryIsValueHashRevealed: allInputs.entryIsValueHashRevealed,
      entryEqualToOtherEntryByIndex: allInputs.entryEqualToOtherEntryByIndex,
      ownerEntryIndex: allInputs.ownerEntryIndex,
      ownerExternalNullifier: allInputs.ownerExternalNullifier,
      ownerIsNullfierHashRevealed: allInputs.ownerIsNullfierHashRevealed,
      globalWatermark: allInputs.globalWatermark
    };
  }

  /**
   * Extract named outputs from the public circuit signals.
   *
   * Because of the flattened array representation of the public signals, the
   * circuit's maxEntries parameter must be known to properly reconstruct
   * output arrays.
   */
  public static outputsFromPublicSignals(
    publicSignals: bigint[],
    maxEntries: number
  ): ProtoPODGPCOutputs {
    return {
      entryRevealedValueHash: publicSignals.slice(0, maxEntries),
      ownerRevealedNulifierHash: publicSignals[maxEntries]
    };
  }

  /**
   * Creates a set of public signals for verification, given public inputs
   * and outputs of a circuit.
   */
  public static makePublicSignals(
    inputs: ProtoPODGPCPublicInputs,
    outputs: ProtoPODGPCOutputs
  ): bigint[] {
    return [
      ...outputs.entryRevealedValueHash,
      outputs.ownerRevealedNulifierHash,
      ...inputs.objectSignerPubkeyAx,
      ...inputs.objectSignerPubkeyAy,
      ...inputs.entryObjectIndex,
      ...inputs.entryNameHash,
      inputs.entryIsValueEnabled,
      inputs.entryIsValueHashRevealed,
      ...inputs.entryEqualToOtherEntryByIndex,
      inputs.ownerEntryIndex,
      inputs.ownerExternalNullifier,
      inputs.ownerIsNullfierHashRevealed,
      inputs.globalWatermark
    ].map(BigInt);
  }

  /**
   * , and returns its circuit description.  Returns
   * if there is no large enough circuit.
   */
  /**
   * Picks the smallest available circuit in this family which can handle the
   * size parameters of a desired configuration.
   *
   * @param params a lower bound on the parameters required
   * @returns the circuit description, or undefined if no circuit can handle
   *   the required parameters.
   */
  public static pickCircuit(
    params: ProtoPODGPCParameters
  ): ProtoPODGPCCircuitDesc | undefined {
    const paramArray = protoPODGPCParameterArray(params);

    for (const circuitDesc of ProtoPODGPC.CIRCUIT_FAMILY) {
      if (
        protoPODGPCParameterArray(circuitDesc).every(
          (param, i) => param >= paramArray[i]
        )
      ) {
        return circuitDesc;
      }
    }
    return undefined;
  }

  public static circuitNameForParams(
    circuitParams: ProtoPODGPCParameters
  ): string {
    return `${PROTO_POD_GPC_FAMILY_NAME}-${circuitParams.maxObjects}o-${circuitParams.maxEntries}e-${circuitParams.merkleMaxDepth}md`;
  }

  private static circuitDescForParams(
    circuitParams: ProtoPODGPCParameters,
    cost: number
  ): ProtoPODGPCCircuitDesc {
    return {
      family: PROTO_POD_GPC_FAMILY_NAME,
      name: ProtoPODGPC.circuitNameForParams(circuitParams),
      cost,
      ...circuitParams
    };
  }

  /**
   * Circuit parameters pulled from `circuitParameters.json`
   * in the form of pairs consisting of the circuit parameters
   * and the cost of the circuit in constraints.
   */
  static CIRCUIT_PARAMETERS: [ProtoPODGPCParameters, number][] =
    circuitParamJson as [ProtoPODGPCParameters, number][];

  /**
   * List of pre-compiled circuits, sorted in order of increasing cost.
   * These should match the declarations in circuits.json for circomkit,
   * and each should correspond to an available set of precompiled artifacts.
   */
  // TODO(POD-P2): Pick convenient circuit sizes for MVP.
  public static CIRCUIT_FAMILY: ProtoPODGPCCircuitDesc[] =
    ProtoPODGPC.CIRCUIT_PARAMETERS.sort((a, b) => a[1] - b[1]).map(
      (pair: [ProtoPODGPCParameters, number]): ProtoPODGPCCircuitDesc =>
        ProtoPODGPC.circuitDescForParams(pair[0], pair[1])
    );
}
