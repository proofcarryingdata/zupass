import { GPCBoundConfig, GPCRevealedClaims } from "@pcd/gpc";
import {
  PCD,
  PCDArgument,
  RecordContainerArgument,
  StringArgument
} from "@pcd/pcd-types";
import { PODEntries, PODName } from "@pcd/pod";
import { PODPCD } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { Groth16Proof } from "snarkjs";

/**
 * Types representing the claims and proof of a GPCPCD, re-exported from the
 * `@pcd/gpc` library.
 */
export type {
  GPCBoundConfig,
  GPCProofConfig,
  GPCProofInputs,
  GPCRevealedClaims
} from "@pcd/gpc";

/**
 * The globally unique type name of the {@link GPCPCD}.
 */
export const GPCPCDTypeName = "gpc-pcd";

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 *
 * This is the root path from which to fetch the ZK artifacts required
 * to prove and verify.  This can be a URL (in browser) or a file path
 * (in Node server or utests).
 */
export type GPCPCDInitArgs = {
  zkArtifactPath: string;
};

/**
 * Record container argument type encapsulating a record of POD PCD
 * arguments. The POD names used here must correspond to those used in the proof
 * configuration.
 */
export type PODPCDRecordArg = RecordContainerArgument<
  PODName,
  PCDArgument<PODPCD, PODPCDArgValidatorParams>,
  PODPCDArgValidatorParams
>;

/**
 * Prescribed signers' public keys for PODs. User inputs to a proof will be
 * filtered to only those PODs containing matching values.
 */
export type PODSignerPublicKeys = Record<PODName, string>;

/**
 * Prescribed POD entries. User inputs to a proof will be filtered to only those
 * PODs containing matching values.
 */
export type PODEntryRecord = Record<PODName, PODEntries>;

/**
 * Validator parameters for POD PCD arguments. These will play a role in
 * filtering the selection of PODs available for a user to choose for their
 * proof.
 */
export type PODPCDArgValidatorParams = {
  /**
   * Message to display if the POD specified in the config does not match any of
   * the available POD PCDs.
   */
  notFoundMessage?: string;

  /**
   * JSON-serialised proof configuration used to narrow down the selection of
   * POD PCDs. May be deserialised using {@link deserializeGPCProofConfig}.
   */
  proofConfig?: string;

  /**
   * JSON-serialised membership lists to narrow down the selection of POD PCDs
   * to those satisfying the list membership check specified in the proof config
   * (if any). May be deserialised using {@link
   * podMembershipListsFromSimplifiedJSON}.
   */
  membershipLists?: string;

  /**
   * JSON-serialised `PODEntries`.This is used to narrow down the selection of
   * POD PCDs to those with entries matching these prescribed values. May be
   * deserialised using {@link podEntryRecordFromSimplifiedJSON}.
   */
  prescribedEntries?: string;

  /**
   * Record of prescribed signers' public keys. This is used to narrow down the
   * selection of POD PCDs to those with signers' public keys matching these
   * prescribed values. May be serialised and deserialised using {@link
   * JSON.stringify} and {@link JSON.parse}.
   */
  prescribedSignerPublicKeys?: PODSignerPublicKeys;
};

/**
 * Defines the essential parameters required for creating a {@link GPCPCD}.
 */
export type GPCPCDArgs = {
  /**
   * A configuration object specifying the constraints to be proven.
   * This will be part of the claims of the resulting proof PCD.
   * See {@link GPCProofConfig} for more information.
   */
  proofConfig: StringArgument;
  // TODO(POD-P2): Figure out serializable format for an object here.
  // ObjectArgument is intended to be directly JSON serializable, so can't
  // contain bigints if used for network requests (e.g. ProveAndAdd).  The
  // choice here should be driven by the needs of the Prove screen.

  /**
   * POD objects to prove about. Each object is identified by name in the value
   * underlying this record container argument.  These are not revealed by
   * default, but a redacted version of their entries will become part of the
   * claims of the resulting proof PCD, as specified by the proof config.
   *
   * See {@link GPCProofConfig} and {@link GPCRevealedClaims} for more
   * information.
   */
  pods: PODPCDRecordArg;

  /**
   * Optional secret info identifying the owner of PODs, if needed by the proof
   * configuration.  This is never revealed.
   */
  identity: PCDArgument<SemaphoreIdentityPCD>;

  /**
   * Optional external nullifier can be any string.  It will be used (by hash)
   * to generate a nullifier hash which is unique to the combination of
   * this value and owner identity.  This can be used to avoid duplicate actions
   * by the same user, without revealing the user's identity.
   */
  externalNullifier: StringArgument;

  /**
   * Optional membership lists, if needed by the proof configuration. This is
   * always revealed. Taken to be a JSON-serialised string for the same reasons
   * outlined for `proofConfig` above.
   */
  membershipLists: StringArgument;

  /**
   * Optional watermark can be any string.  It will be included (by hash) in the
   * proof and cryptographically verified.  This can be used to avoid reuse of
   * the same proof.
   */
  watermark: StringArgument;
  // TODO(POD-P3): Support PODValue of multiple types.

  /**
   * A string that uniquely identifies a {@link GPCPCD}. If this argument is
   * not specified a random id will be generated.
   *
   * This ID is not cryptographically verified.  An issuer can choose
   * to include the ID in the watermark or external nullifier if desired, but
   * this PCD type doesn't enforce that.
   */
  id?: StringArgument;
  // TODO(POD-P3): Support PODValue of multiple types.
};

/**
 * Defines the GPCD PCD's claim.  A GPC proofs includes the proof configuration
 * (bound to the specific circuit used), and a redacted view of the inputs.
 */
export interface GPCPCDClaim {
  /**
   * The entries of this POD, in sorted order as they are Merklized.
   * See the {@link pod} accessor on {@link GPCPCD} if you need to manipulate
   * these entries as a POD object.
   */
  config: GPCBoundConfig;

  /**
   * Redacted view of the inputs to this proof, as revealed by the proof
   * configuration.
   */
  revealed: GPCRevealedClaims;
}

/**
 * Defines the GPC PCD proof.  The proof is a Groth16 proof from a specific
 * circuit in the supported family of circuits.
 */
export interface GPCPCDProof {
  /**
   * Groth16 proof which can be used to cryptographically verify the
   * {@link GPCPCDClaim}.
   */
  groth16Proof: Groth16Proof;
}

/**
 * The GPC PCD is a generic proof of a configurable set of constraints about
 * one or more POD objects.  The {@link GPCPCDClaim} specifies the proof
 * configuration, and a redacted view of the proof inputs.  The
 * {@link GPCPCDProof} contains a cryptographic proof of the validity of
 * this proof.
 *
 * The proofs supported by this PCD are not tied to a single ZK circuit, but
 * can be generated using one of several circuits in a supported family,
 * depending on the needs of the configuration and inputs.  Picking the right
 * circuit and formatting the inputs is handled automatically using the
 * `@pcd/gpc` package.
 *
 * Verifying a GPCPCD indicates that the proof config and revealed inputs
 * match those used to generate the proof.  Since GPCs are very configurable,
 * the caller must separately check whether the proof config and revealed
 * values properly reflect the needs of their use case.  E.g. they should
 * check that the PODs were signed by a trusted public key, and that the
 * config matches their expectations.
 */
export class GPCPCD implements PCD<GPCPCDClaim, GPCPCDProof> {
  type = GPCPCDTypeName;
  readonly claim: GPCPCDClaim;
  readonly proof: GPCPCDProof;
  readonly id: string;

  /**
   * Create a PCD to encapsulate the given ID and GPC info.
   */
  public constructor(id: string, claim: GPCPCDClaim, proof: GPCPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
