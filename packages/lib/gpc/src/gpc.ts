import {
  PROTO_POD_GPC_FAMILY_NAME,
  ProtoPODGPC,
  ProtoPODGPCCircuitDesc,
  githubDownloadRootURL,
  gpcArtifactPaths,
  unpkgDownloadRootURL
} from "@pcd/gpcircuits";
import urljoin from "url-join";
import {
  checkCircuitRequirements,
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
  GPCProof,
  GPCProofConfig,
  GPCProofInputs,
  GPCRevealedClaims
} from "./gpcTypes";
import {
  GPCRequirements,
  canonicalizeConfig,
  makeCircuitIdentifier
} from "./gpcUtil";

/**
 * ProtoPODGPC circuit family type.
 */
export type GPCCircuitFamily = ProtoPODGPCCircuitDesc[];

/**
 * Default production ProtoPODGPC circuit family.
 */
export const DefaultCircuitFamily = ProtoPODGPC.CIRCUIT_FAMILY;

function bindConfigWithRequirements(
  proofConfig: GPCProofConfig,
  circuitReq: GPCRequirements,
  circuitFamily: GPCCircuitFamily
): { boundConfig: GPCBoundConfig; circuitDesc: ProtoPODGPCCircuitDesc } {
  // Assumes proofConfig has already been checked by the caller.
  const circuitDesc = checkCircuitRequirements(
    circuitReq,
    circuitFamily,
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
 * `proofConfig.circuitIdentifier`.  (See {@link DefaultCircuitFamily}
 * for supported circuits.)
 *
 * @param proofConfig the raw proof config to bind.
 * @param [circuitFamily=ProtaoPODGPC.CIRCUIT_FAMILY] the circuit family to pick
 *   the circuit from. This must be sorted in order of increasing circuit size
 *   (constraint count).
 * @returns a new configuration object bound and canonicalized (see
 *   {@link GPCBoundConfig}), as well as a description of selected circuit.
 * @throws TypeError if the input configuration is malformed
 * @throws Error if the requirements of the given configuration are impossible
 *   to meet with the given circuit
 */
export function gpcBindConfig(
  proofConfig: GPCProofConfig,
  circuitFamily: GPCCircuitFamily = DefaultCircuitFamily
): {
  boundConfig: GPCBoundConfig;
  circuitDesc: ProtoPODGPCCircuitDesc;
} {
  const circuitReq = checkProofConfig(proofConfig);
  return bindConfigWithRequirements(proofConfig, circuitReq, circuitFamily);
}

/**
 * Checks whether the the given configuration and inputs can be used to generate
 * a valid GPC Proof.  This function performs all of the argument checks of
 * {@link gpcProve}, but does not perform expensive proof generation or trigger
 * any side-effects such as downloading artifacts.  See the
 * documentation of the input and output types for more details:
 * {@link GPCProofConfig}, {@link GPCProofInputs}, {@link GPCBoundConfig}, and
 * {@link ProtoPODGPCCircuitDesc}.
 *
 * If the config or inputs cannot be used to generate a valid proof with
 * the supported circuits, this function will throw an exception with a message
 * explaining why.  If this function returns successfully, it should be possible
 * to later call {@link gpcProve} with the same arguments without any risk of
 * failing due to config or inputs, though internal errors in proof generation
 * or artifact download are still possible.
 *
 * The specific ZK circuit needed will be picked as the smallest supported
 * circuit which can fit the configuration and inputs.  If you need a specific
 * circuit to be used instead (e.g. to support larger object sizes for
 * future reuse), you can specify that in `proofConfig.circuitIdentifier`.
 * (See {@link DefaultCircuitFamily} for supported circuits.)
 *
 * @param proofConfig the configuration specifying the constraints to be proven.
 * @param proofInputs the input data (PODs and other values) specific to this
 *  proof.
 * @param [circuitFamily=DefaultCircuitFamily] the circuit family to pick
 *   the circuit from. This must be sorted in order of increasing circuit size
 *   (constraint count).
 * @returns a new configuration object bound and canonicalized (see
 *   {@link GPCBoundConfig}), as well as a description of selected circuit.
 * @throws TypeError if any of the arguments is malformed
 * @throws Error if the requirements of the given configuration are impossible
 *   to meet with the given circuit
 */
export function gpcCheckProvable(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs,
  circuitFamily: GPCCircuitFamily = DefaultCircuitFamily
): {
  boundConfig: GPCBoundConfig;
  circuitDesc: ProtoPODGPCCircuitDesc;
} {
  const circuitReq = checkProofArgs(proofConfig, proofInputs);
  return bindConfigWithRequirements(proofConfig, circuitReq, circuitFamily);
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
 * (See {@link DefaultCircuitFamily} for supported circuits.)
 *
 * @param proofConfig the configuration specifying the constraints to be proven.
 * @param proofInputs the input data (PODs and other values) specific to this
 *  proof.
 * @param pathToArtifacts the path to the root folder where circuit artifacts
 *   can be found.  This may be a URL (in browser) or a filesystem path (in
 *   Node).
 * @param [circuitFamily=DefaultCircuitFamily] the circuit family to pick
 *   the circuit from. This must be sorted in order of increasing circuit size
 *   (constraint count).
 * @returns The Groth16 proof, a bound configuration usable for reliable
 *   verification or future proofs (see {@link GPCBoundConfig}), and the
 *   revealed claims of this proof (see {@link GPCRevealedClaims}).
 * @throws TypeError if any of the arguments is malformed
 * @throws Error if it is impossible to create a valid proof
 */
export async function gpcProve(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs,
  pathToArtifacts: string,
  circuitFamily: GPCCircuitFamily = DefaultCircuitFamily
): Promise<{
  proof: GPCProof;
  boundConfig: GPCBoundConfig;
  revealedClaims: GPCRevealedClaims;
}> {
  const { boundConfig, circuitDesc } = gpcCheckProvable(
    proofConfig,
    proofInputs,
    circuitFamily
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
 * @param [circuitFamily=DefaultCircuitFamily] the circuit family to pick
 *   the circuit from. This must be sorted in order of increasing circuit size
 *   (constraint count).
 * @returns true if the proof is valid
 * @throws TypeError if any of the arguments is malformed
 * @throws Error if the proof cannot be verified
 */
export async function gpcVerify(
  proof: GPCProof,
  boundConfig: GPCBoundConfig,
  revealedClaims: GPCRevealedClaims,
  pathToArtifacts: string,
  circuitFamily: GPCCircuitFamily = DefaultCircuitFamily
): Promise<boolean> {
  const circuitReq = checkVerifyArgs(boundConfig, revealedClaims);
  const circuitDesc = checkCircuitRequirements(
    circuitReq,
    circuitFamily,
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

/**
 * Name of the package on NPM which contains published artifacts for this
 * GPC family.
 */
export const GPC_ARTIFACTS_NPM_PACKAGE_NAME =
  ProtoPODGPC.ARTIFACTS_NPM_PACKAGE_NAME;

/**
 * Version of the published artifacts on NPM which are compatible with this
 * version of the GPC circuits.
 */
export const GPC_ARTIFACTS_NPM_VERSION = ProtoPODGPC.ARTIFACTS_NPM_VERSION;

/**
 * Possible sources to download GPC artifacts.
 *
 * Note that the `zupass` source is not currently usable outside of the
 * Zupass app itself.
 */
export type GPCArtifactSource = "zupass" | "github" | "unpkg";

/**
 * Stability level of GPC artifacts to use.  Test artifacts are for use
 * in active development while prod artifacts are officially released.
 */
export type GPCArtifactStability = "prod" | "test";

/**
 * Version specifier for GPC artifacts.  It meaning depends on the source.
 * It might be the version of an NPM package release (e.g. 1.0.1) or a GitHub
 * revision identifier (branch, tag, or commit).
 */
export type GPCArtifactVersion = string | undefined;

/**
 * Forms a URL for downloading GPC artifacts depending on configuration
 *
 * @param source the download source location
 * @param stability the stability level (test or prod) of artifacts to seek.
 *   Ignored in some sources in favor of the version.
 * @param version the version identifier for circuit artifacts.  Not relevant
 *   to some sources which host only a single version.  NPM-based sources
 *   can be given an undefined version and will use the
 *   {@link GPC_ARTIFACTS_NPM_VERSION} constant.
 * @param zupassURL the base URL for Zupass, if used as a download option.
 *   Can be "" or "/" to use a relative URL (within the Zupass app).
 * @returns a root URL to download GPC artifacts, as needed for {@link gpcProve}
 *   or {@link gpcVerify}.
 */
export function gpcArtifactDownloadURL(
  source: GPCArtifactSource,
  stability: GPCArtifactStability,
  version: GPCArtifactVersion,
  zupassURL?: string
): string {
  switch (source) {
    case "github":
      const REPO_NAME = "proofcarryingdata/snark-artifacts";
      if (version === undefined || version === "") {
        throw new Error("GitHub artifact download requires a version.");
      }
      return githubDownloadRootURL(
        REPO_NAME,
        PROTO_POD_GPC_FAMILY_NAME,
        version
      );
    case "unpkg":
      if (version === undefined || version === "") {
        version = GPC_ARTIFACTS_NPM_VERSION;
      }
      // stability is intentionally ignored.  NPM version can encode
      // pre-release status.
      return unpkgDownloadRootURL(PROTO_POD_GPC_FAMILY_NAME, version);
    case "zupass":
      // TODO(POD-P4): Do we want to expose source=zupass as a public option?
      // If so, we need the Zupass server to not set `Access-Control-Allow-Origin: *`,
      // or migrate to a different hosting option.
      if (zupassURL === undefined) {
        throw new Error(
          'Zupass artifact download requires a server URL.  Try "https://zupass.org".'
        );
      }
      return urljoin(
        zupassURL,
        stability === "test" ? "artifacts/test" : "artifacts",
        PROTO_POD_GPC_FAMILY_NAME
      );
    default:
      throw new Error(`Unknown artifact download source ${source}.`);
  }
}
