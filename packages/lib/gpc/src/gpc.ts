import {
  ProtoPODGPC,
  ProtoPODGPCCircuitDesc,
  gpcArtifactPaths
} from "@pcd/gpcircuits";
import { Groth16Proof } from "snarkjs";
import {
  checkCircuitParameters,
  checkProofArgs,
  checkProofConfig,
  checkVerifyArgs
} from "./gpcChecks";
import {
  compileProofConfig,
  compileVerifyConfig,
  makeRevealedClaims
} from "./gpcCompile";
import {
  GPCBoundConfig,
  GPCProofConfig,
  GPCProofInputs,
  GPCRevealedClaims,
  GPCCircuitRequirements
} from "./gpcTypes";
import { canonicalizeConfig, makeCircuitIdentifier } from "./gpcUtil";

function bindConfigWithRequirements(
  proofConfig: GPCProofConfig,
  circuitReq: GPCCircuitRequirements
): { boundConfig: GPCBoundConfig; circuitDesc: ProtoPODGPCCircuitDesc } {
  // Assumes proofConfig has already been checked by the caller.
  const circuitDesc = checkCircuitParameters(
    circuitReq,
    proofConfig.circuitIdentifier
  );
  const boundConfig = canonicalizeConfig(
    proofConfig,
    makeCircuitIdentifier(circuitDesc)
  );
  return { boundConfig, circuitDesc };
}

/**
 * Checks, binds, and canonicalizes a GPCProofConfig so it can be reused
 * for multiple proofs.  See {@link GPCBoundConfig} for more details.
 *
 * If the config specifies a specific circuit identifier, that circuit will
 * be used to bind.  Otherwise this function will pick the smallest circuit
 * which fits the config.
 *
 * Note that this function does not necessarily produce a configuration that
 * will work for all possible inputs. In particular the max POD size supported
 * by an auto-selected circuit might not be sufficient for all inputs.  If you
 * anticipate a larger size, you should pick your circuit explicitly using
 * `proofConfig.circuitIdentifier`.  (See {@link ProtoPODGPC.CIRCUIT_FAMILY}
 * for supported circuits.)
 *
 * @param proofConfig the raw proof config to bind.
 * @returns a new configuration object bound and canonicalized as described
 *   above.
 * @throws TypeError if the input configuration is malformed
 * @throws Error if the requirements of the given configuration are impossible
 *   to meet with the given circuit
 */
export function gpcBindConfig(proofConfig: GPCProofConfig): {
  boundConfig: GPCBoundConfig;
  circuitDesc: ProtoPODGPCCircuitDesc;
} {
  const circuitReq = checkProofConfig(proofConfig);
  return bindConfigWithRequirements(proofConfig, circuitReq);
}

/**
 * Generates a GPC proof for the given configuration and inputs.  See the
 * documentation of the input and output types for more details:
 * {@link GPCProofConfig}, {@link GPCProofInputs}, {@link GPCBoundConfig}, and
 * {@link GPCRevealedClaims}.
 *
 * The specific ZK circuit used will be picked as the smallest supported
 * circuit which can fit the configuration and inputs.  If you need a specific
 * circuit to be used instead (e.g. to support larger object sizes for
 * future reuse), you can specify that in `proofConfig.circuitIdentifier`.
 * (See {@link ProtoPODGPC.CIRCUIT_FAMILY} for supported circuits.)
 *
 * @param proofConfig the configuration specifying the constraints to be proven.
 * @param proofInputs the input data (PODs and other values) specific to this
 *  proof.
 * @param pathToArtifacts the path to the root folder where circuit artifacts
 *   can be found.  This may be a URL (in browser) or a filesystem path (in
 *   Node).
 * @returns The groth16 proof, a bound configuration usable for reliable
 *   verification or future proofs (see {@link GPCBoundConfig}), and the
 *   revealed claims of this proof (see {@link GPCRevealedClaims}).
 * @throws TypeError if any of the arguments is malformed
 * @throws Error if it is impossible to create a valid proof
 */
export async function gpcProve(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs,
  pathToArtifacts: string
): Promise<{
  proof: Groth16Proof;
  boundConfig: GPCBoundConfig;
  revealedClaims: GPCRevealedClaims;
}> {
  const circuitReq = checkProofArgs(proofConfig, proofInputs);
  const { boundConfig, circuitDesc } = bindConfigWithRequirements(
    proofConfig,
    circuitReq
  );

  const artifactPaths = gpcArtifactPaths(pathToArtifacts, circuitDesc);

  const circuitInputs = compileProofConfig(
    boundConfig,
    proofInputs,
    circuitDesc
  );

  const { proof, outputs: circuitOutputs } = await ProtoPODGPC.prove(
    circuitInputs,
    artifactPaths.wasmPath,
    artifactPaths.pkeyPath
  );
  const revealedClaims = makeRevealedClaims(
    boundConfig,
    proofInputs,
    circuitOutputs
  );
  return { proof, boundConfig, revealedClaims };
}

/**
 * Verifies a GPC proof produced by {@link gpcProve}.  See the
 * documentation of the input types for more details:
 * {@link GPCBoundConfig} and {@link GPCRevealedClaims}.
 *
 * Note that the bound config must match the object produced by {@link gpcProve}
 * along with the proof.  If you wish to reuse a config and avoid
 * transmitting it along with the proof, you can use {@link gpcBindConfig} to
 * obtain an object which should remain stable and reusable.
 *
 * @param proof the Groth16 proof generated by {@link gpcProve}.
 * @param boundConfig the bound configuration specifying the constraints
 *   proven, and the specific circuit which was used.
 * @param revealedClaims the revealed parts of the proof inputs and outputs.
 * @param pathToArtifacts the path to the root foler where circuit artifacts
 *   can be found.  This may be a URL (in browser) or a filesystem path (in
 *   Node).
 * @returns true if the proof is valid
 * @throws TypeError if any of the arguments is malformed
 * @throws Error if the proof cannot be verified
 */
export async function gpcVerify(
  proof: Groth16Proof,
  boundConfig: GPCBoundConfig,
  revealedClaims: GPCRevealedClaims,
  pathToArtifacts: string
): Promise<boolean> {
  const circuitReq = checkVerifyArgs(boundConfig, revealedClaims);
  const circuitDesc = checkCircuitParameters(
    circuitReq,
    boundConfig.circuitIdentifier
  );

  const { circuitPublicInputs, circuitOutputs } = compileVerifyConfig(
    boundConfig,
    revealedClaims,
    circuitDesc
  );

  return await ProtoPODGPC.verify(
    gpcArtifactPaths(pathToArtifacts, circuitDesc).vkeyPath,
    proof,
    circuitPublicInputs,
    circuitOutputs
  );
}
