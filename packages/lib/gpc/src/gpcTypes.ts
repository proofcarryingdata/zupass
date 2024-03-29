import { POD, PODName, PODValue } from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";

/**
 * String specifying a named entry in a named object, in the format
 * `objectName.entryName`.  Each of the sub-parts should be a valid PODName,
 * checked by {@link POD_NAME_REGEX}.
 */
export type PODEntryIdentifier = `${PODName}.${PODName}`;

/**
 * String specifying a specific GPC circuit, identified by its family name
 * and circuit name.
 */
export type GPCIdentifier = `${string}_${string}`;

// TODO(POD-P1): More more documentation of subtypes and subfields.

export type GPCProofEntryConfig = {
  isRevealed: boolean;
  isOwnerCommitment?: boolean;
  equalsEntry?: PODEntryIdentifier;

  // TODO(POD-P3): Constraints on entry values can go here.  Lower/upper bounds,
  // comparison to constant, etc.
  // TODO(POD-P3): Think about where to represent "filtering" inputs in
  // public ways.  E.g. comparison to a constant requires revealing anyway,
  // so isn't handled by this layer for now, but that could be a convenience
  // feature for use cases where the verifier uses a hard-coded config.
};

export type GPCProofObjectConfig = {
  entries: Record<PODName, GPCProofEntryConfig>;

  // TODO(POD-P3): Is there anything to configure at this level?  Or can we
  // collapose it?
  // TODO(POD-P3): Think about where to represent "filtering" inputs in
  // public ways.  E.g. requiring a specific signer, which is revealed anyway,
  // so isn't handled by this layer for now, but that could be a convenience
  // feature for use cases where the verifier uses a hard-coded config.
};

/**
 * Contains the specific constraints to be proven in a GPC proof.  GPC
 * configuration tends to be fixed and reusable, as distinct from
 * {@link GPCProofInputs} which tends to use. differ for each proof.
 *
 * The primary use of this type is as input to {@link gpcProve}, which will
 * automatically pick a ZK circuit to fit the configuration and inputs.
 * Proving will produce a {@link GPCBoundConfig} usuable for verification
 * via {@link gpcVerify}.  You can also call {@link gpcBindConfig} to explicitly
 * create a fixed config which can be reused for multiple proofs and
 * verifiations.
 *
 * See the documentation of the various fields and subtypes for more details.
 *
 */
export type GPCProofConfig = {
  circuitIdentifier?: GPCIdentifier;
  pods: Record<PODName, GPCProofObjectConfig>;
};

/**
 * A {@link GPCProofConfig} which has been checked, bound, and canonicalized
 * by a call to {@link gpcBindConfig} or {@link gpcProve}.  A bound config
 * should be deterministic and compatible so that reusing the same
 * `GPCBoundConfig` will always result in the same proof and verification
 * behavior circuit, even if new circuits are added to the family.  This
 * is intended to allow for cases where the config doesn't need to be
 * transmitted separately along with every proof, but is already known
 * to the verifier.
 *
 * In the type system, the only difference from a {@link GPCProofConfig} is that
 * the ciruit identifier is a required field, fixing the choice of circuit.
 * However, there are other properties which a `GPCBoundConfig` is expected to
 * meet after the steps used to generate it:
 *
 * - Checking verifies that the contents of the configuration is valid, and
 *   should be usable to generate proofs (with appropriate inputs).
 * - Binding fills in the circuit identifier in the config and validates
 *   that the config fits within the circuit's parameters.  Using a bound
 *   config for future proofs ensures the same circuit is used.
 * - Canonicalizing eliminates optional fields containing default values,
 *   and also ensures that object and entry names sort in order.  This
 *   ensures that two configs which behave the same are deep equal.
 *
 * Note that these steps cannot verify anything about future inputs.  In
 * particular the max POD size supported by an auto-selected circuit might
 * not be sufficient for all inputs.  If you need a larger size, you can pick
 * your circuit explicitly using the circuitIdentifier argument.
 */
export type GPCBoundConfig = GPCProofConfig & {
  circuitIdentifier: GPCIdentifier;
};

/**
 * Contains the specific input data for proof.  GPC inputs tend to differ for
 * each proof, as opposed to configuration (see {@link GPCProofConfig} which
 * tends to be fixed and reusable.
 *
 * The purpose of this type is as input to {@link gpcProve}, which will
 * automatically pick a ZK circuit to fit the configuration and inputs.
 * Redacted portions of this type will be present in the resulting
 * {@link GPCRevealedClaims}.  These claims can be used to describe the proof,
 * and also passed to {@link gpcVerify} to verify the proof.
 *
 * See the documentation of the various fields and subtypes for more details.
 */
export type GPCProofInputs = {
  pods: Record<PODName, POD>;
  ownerSemaphoreV3?: Identity;
  externalNullifier?: PODValue;
  watermark?: PODValue;
};

export type GPCRevealedObjectClaims = {
  entries?: Record<PODName, PODValue>;
  signerPublicKey: string;
};

/**
 * Contains the public data revealed in a GPC proof.  These are redacted or
 * derived from {@link GPCProofInputs}.  GPC inputs and claims tend to differ
 * for each proof, as opposed to configuration (see {@link GPCBoundConfig} which
 * tends to be fixed and reusable.
 *
 * The purpose of this type is to describe the proof to users and to other code,
 * and to serve as input to {@link gpcVerify} to verify that the proof is valid
 * and matches the claims.
 *
 * See the documentation of the various fields and subtypes for more details.
 */
export type GPCRevealedClaims = {
  pods: Record<PODName, GPCRevealedObjectClaims>;
  externalNullifier?: PODValue;
  nullifierHash?: bigint;
  watermark?: PODValue;
};
