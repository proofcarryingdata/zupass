import { POD, PODEntries, PODName, PODValue, PODValueTuple } from "@pcd/pod";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { Identity as IdentityV4 } from "@semaphore-protocol/core";
import type { Groth16Proof } from "snarkjs";

/**
 * String specifying a named entry, virtual or otherwise, in a named object, in
 * the format `objectName.entryName`.  Each of the sub-parts should be a valid
 * PODName, checked by {@link @pcd/pod!POD_NAME_REGEX} or
 * {@link POD_VIRTUAL_NAME_REGEX}.
 *
 * Examples: "ticket1.eventID", "award.$signerPublicKey"
 */
export type PODEntryIdentifier = `${PODName}.${PODName | PODVirtualEntryName}`;

/**
 * Regex matching legal entry identifiers for virtual POD entries; these are of
 * the form `${PODName}.${PODVirtualEntryName}`.
 */
export const POD_VIRTUAL_ENTRY_IDENTIFIER_REGEX = new RegExp(
  /([A-Za-z_]\w*)\.\$(signerPublicKey|contentID)$/
);

/**
 * String specifying valid virtual entry name.
 */
export type PODVirtualEntryName = "$signerPublicKey" | "$contentID";

/**
 * Regex matching legal names for POD virtual entries. Matches
 * `PODVirtualEntryName`.
 */
export const POD_VIRTUAL_NAME_REGEX = new RegExp(
  /^\$(signerPublicKey|contentID)$/
);

/**
 * Optional set of lists for checking POD entry (or tuple) value
 * (non-)membership in the form of a record mapping list names to lists of
 * either POD values or POD value tuples.

 * Proof configurations with list membership checks refer to these lists by
 * name, and this record should appear in both the proof inputs and the revealed
 * claims. Each list must be non-empty, and these lists may be used for multiple
 * list (non-)membership checks in {@link GPCProofEntryConfig} and
 * {@link GPCProofTupleConfig}. These lists are duplicated on the circuit level
 * so that the circuit size is proportional to the number of membership checks
 * rather than the number of distinct lists.
 */
export type PODMembershipLists = Record<PODName, PODValue[] | PODValueTuple[]>;

/**
 * Single source of truth for tuple prefix (used internally).
 * This should not be a valid {@link PODName} to avoid name clashes.
 */
export const TUPLE_PREFIX = "$tuple";

/**
 * Type representation of the tuple prefix string "$tuple".
 */
export type TuplePrefix = typeof TUPLE_PREFIX;

/**
 * String specifying a named tuple in the format `tuple.tupleName`.
 * `tupleName` should be a valid PODName checked by
 * {@link @pcd/pod!POD_NAME_REGEX}.
 */
export type TupleIdentifier = `${TuplePrefix}.${PODName}`;

/**
 * String specifying a specific GPC circuit, identified by its family name
 * and circuit name.
 */
export type GPCIdentifier = `${string}_${string}`;

/**
 * String specifying the identity protocol used in the `isOwnerID`
 * field of {@link GPCProofEntryConfig}.
 */
export type IdentityProtocol = typeof SEMAPHORE_V3 | typeof SEMAPHORE_V4;

/**
 * Semaphore V3 identity protocol string
 */
export const SEMAPHORE_V3 = "SemaphoreV3";

/**
 * Semaphore V4 identity protocol string
 */
export const SEMAPHORE_V4 = "SemaphoreV4";

/**
 * GPCProofConfig for a single generic POD entry, virtual or otherwise,
 * specifying which features and constraints should be enabled for that entry.
 */
export type GPCProofEntryConfigCommon = {
  /**
   * Indicates whether this entry should be revealed in the proof.  Setting
   * this to `true` will result in the entry's value being included in
   * {@link GPCRevealedClaims}, and its hash being verified in
   * {@link gpcVerify}. Note that for signers' public keys, the absence
   * of a config amounts to setting this to `true`.
   */
  isRevealed: boolean;

  /**
   * Indicates that this entry must be equal to another entry.  The other
   * entry is specified by a 2-part {@link PODEntryIdentifier} string
   * used to find the entry in one of the pods in {@link GPCProofInputs}.
   *
   * Comparison in the proof circuit is based on the hash produced by
   * {@link @pcd/pod!podValueHash}.  This means values of different types can be
   * considered equal if they are treated in the same way by circuits.
   *
   * If undefined, there is no equality constraint.
   *
   * This feature cannot be combined with `notEqualsEntry` or `isOwnerID` on the
   * same entry (since it shares the same constraints in the circuit).  Since
   * equality constraints can be specified in either direction, you can still
   * constrain an owner entry by specifying it on the non-owner entry.
   */
  equalsEntry?: PODEntryIdentifier;

  /**
   * Indicates that this entry must not be equal to another entry.  The other
   * entry is specified by a 2-part {@link PODEntryIdentifier} string used to
   * find the entry in one of the pods in {@link GPCProofInputs}.
   *
   * Comparison in the proof circuit is based on the hash produced by
   * {@link @pcd/pod!podValueHash}.  This means values of different types can be
   * considered equal if they are treated in the same way by circuits.
   *
   * If undefined, there is no inequality constraint.
   *
   * This feature cannot be combined with `equalsEntry` or `isOwnerID` on the
   * same entry (since it shares the same constraints in the circuit). Since
   * inequality constraints can be specified in either direction, you can still
   * constrain an owner entry by specifying it on the non-owner entry.
   */
  notEqualsEntry?: PODEntryIdentifier;

  /**
   * Indicates a single list in which this entry must lie, which corresponds to
   * exactly one list membership check in the circuit. This feature is optional,
   * and if it is enabled, `isNotMemberOf` must be disabled, since having both
   * enabled is equivalent to `isMemberOf` being checked for the set-theoretic
   * difference of the two list. Note that if an inclusion in multiple lists is
   * to be checked, the set-theoretic intersection of all of these lists can be
   * formed and used as the single membership list to check.
   */
  isMemberOf?: PODName;

  /**
   * Indicates a list in which this entry must *not* lie, which corresponds to
   * exactly one list non-membership check in the circuit. This feature is
   * optional, and if it is enabled, `isMemberOf` must be disabled, since having
   * both enabled is equivalent to `isMemberOf` being checked for the
   * set-theoretic difference of the two lists. Note that if an exclusion from
   * multiple lists is to be checked, the set-theoretic union of all of these
   * lists can be formed and used as the single non-membership list to check.
   */
  isNotMemberOf?: PODName;

  // TODO(POD-P3): Think about where to represent "filtering" inputs in
  // public ways.  E.g. comparison to a constant requires revealing anyway,
  // so isn't handled by this layer for now, but that could be a convenience
  // feature for use cases where the verifier uses a hard-coded config.
};

/**
 * Convenient type for closed intervals used in (out of) bounds/range checks.
 */
export type GPCClosedInterval = { min: bigint; max: bigint };

/**
 * Bounds check configuration for an individual entry. This specifies the bounds
 * checks required for that entry.
 */
export type GPCProofEntryBoundsCheckConfig = {
  /**
   * Indicates the range/interval/bounds within which this entry should
   * lie. Both (inclusive) bounds must be specified, and they should be
   * signed 64-bit integer values. They will always be revealed by virtue of
   * their inclusion in the proof configuration.
   */
  inRange?: GPCClosedInterval;

  /**
   * Indicates the range/interval/bounds outside of which this entry should
   * lie. Both (inclusive) bounds must be specified, and they should be signed
   * 64-bit integer values. They will always be revealed by virtue of their
   * inclusion in the proof configuration.
   */
  notInRange?: GPCClosedInterval;
};

/**
 * Entry inequality configuration for an individual entry. This specifies
 * inequalities that should be satisfied with respect to other entries. All such
 * entries must be bounds-checked to lie in (a subset of) the appropriate range
 * ([POD_INT_MIN, POD_INT_MAX]), lest the resulting circuit be underconstrained.
 */
export type GPCProofEntryInequalityConfig = {
  /**
   * Indicates an entry that should be greater than this one.
   */
  lessThan?: PODEntryIdentifier;

  /**
   * Indicates an entry that should be greater than or equal to this one.
   */
  lessThanEq?: PODEntryIdentifier;

  /**
   * Indicates an entry that should be less than this one.
   */
  greaterThan?: PODEntryIdentifier;

  /**
   * Indicates an entry that should be less than or equal to this one.
   */
  greaterThanEq?: PODEntryIdentifier;
};

/**
 * GPCProofConfig for a single non-virtual POD entry, specifying which features
 * and constraints should be enabled for that entry.
 */
export type GPCProofEntryConfig = GPCProofEntryConfigCommon &
  GPCProofEntryBoundsCheckConfig &
  GPCProofEntryInequalityConfig & {
    /**
     * Indicates that this entry must match the public ID of the owner identity
     * given in {@link GPCProofInputs}. For Semaphore V3 this is the owner's
     * Semaphore commitment (a cryptographic value), whereas for Semaphore V4 this
     * is the owner's EdDSA public key (a PODEdDSAPublicKeyValue) that hashes to
     * their identity commitment.
     *
     * Comparison in the proof circuit is based on the hash produced by
     * {@link @pcd/pod!podValueHash}.  This means values of different types can be
     * considered equal if they are treated in the same way by circuits.
     *
     * If undefined, there is no owner-related constraint on this entry.
     *
     * This feature cannot be combined with `equalsEntry` on the same entry (since
     * it shares the same constraints in the circuit).  However since equality
     * constraints can be specified in either direction, you can still constrain
     * an owner entry by specifying it on the non-owner entry.
     */
    isOwnerID?: IdentityProtocol;
  };

/**
 * GPCProofConfig for a single POD object, specifying which featuers and
 * constraints should be enabled for that object and its entries.
 */
export type GPCProofObjectConfig = {
  /**
   * The entries of this object to be proven.  This is generally not all of
   * the entries of a POD, but only the entries which need to be proven.
   *
   * For each entry here, the GPC will prove that an entry by that name exists
   * in the POD's Merkle tree representation.  The entry's name is always
   * revealed by its hash in the proof, with the full name included in the
   * {@link GPCBoundConfig}.  The entry's value may be hidden or revealed, or
   * constrained in other ways based on other parts of this configuration.
   */
  entries: Record<PODName, GPCProofEntryConfig>;

  /**
   * The content ID of this object to be proven. The GPC can choose
   * to simply reveal it or else hide it but constrain it to lie in a list or
   * be equal to another object's signing key. If this configuration
   * is undefined, the content ID will not be revealed.
   */
  contentID?: GPCProofEntryConfigCommon;

  /**
   * The signer's public key of this object to be proven. The GPC can choose
   * to simply reveal it or else hide it but constrain it to lie in a list or
   * be equal to another object's signing key. If this configuration
   * is undefined, the signer's public key will be revealed.
   */
  signerPublicKey?: GPCProofEntryConfigCommon;

  // TODO(POD-P3): Think about where to represent "filtering" inputs in
  // public ways.  E.g. requiring a specific signer, which is revealed anyway,
  // so isn't handled by this layer for now, but that could be a convenience
  // feature for use cases where the verifier uses a hard-coded config.
};

/**
 * GPCProofConfig for a single tuple, specifying which entries lie in the tuple
 * and which membership lists the tuple lies in.
 */
export type GPCProofTupleConfig = {
  /**
   * Identifiers of the POD entries that form the tuple (in order). These must
   * be POD entry identifiers, not tuples.
   */
  entries: PODEntryIdentifier[];

  /**
   * Indicates a list in which this entry must lie. The same remarks in
   * {@link GPCProofEntryConfig} regarding `isMemberOf` apply here.
   */
  isMemberOf?: PODName;

  /**
   * Indicates a list in which this entry must *not* lie. The same remarks in
   * {@link GPCProofEntryConfig} regarding `isNotMemberOf` apply here.
   */
  isNotMemberOf?: PODName;
};

/**
 * Contains the specific constraints to be proven in a GPC proof.  GPC
 * configuration tends to be fixed and reusable, as distinct from
 * {@link GPCProofInputs} which tends to differ for each proof.
 *
 * The primary use of this type is as an argument to {@link gpcProve}, which
 * will automatically pick a ZK circuit to fit the configuration and inputs.
 * Proving will produce a {@link GPCBoundConfig} usuable for verification
 * via {@link gpcVerify}.  You can also call {@link gpcBindConfig} to explicitly
 * create a canonical config which can be reused for multiple proofs and
 * verifiations.
 *
 * See the documentation of the various fields and subtypes for more details.
 */
export type GPCProofConfig = {
  /**
   * {@link GPCIdentifier} specifying a specific ZK circuit to use in proving
   * and verifying.  If not specified, {@link gpcProve} or {@link gpcBindConfig}
   * will pick the smallest supported circuit which can handle this
   * configuration.
   *
   * See {@link "@pcd/gpcircuits"!ProtoPODGPC.CIRCUIT_FAMILY} for supported circuits.)
   */
  circuitIdentifier?: GPCIdentifier;

  /**
   * Indicates the number of objects to be included in the proof, and the
   * constrants to be proven about those objects in each {@link GPCProofConfig}.
   *
   * Each POD object mentioned here must be provided in {@link GPCProofInputs}.
   * The GPC proof will validate that the POD's signature is valid, and reveal
   * the signer's public key.  The POD's content ID and other global info is
   * not revealed in the proof.  Other features and constraints for this POD
   * and its entries are optionally specified in {@link GPCProofObjectConfig}.
   *
   * The names assigned here are used to refer these PODs in
   * {@link GPCProofInputs}, as well as in {@link PODEntryIdentifier} strings
   * elsewhere in configuration.  They are also used to assign a standard
   * order to the PODs in the circuit.  The names are not cryptographically
   * verified, since they are not a part of the PODs, but simply a convenience
   * for configuration.
   */
  pods: Record<PODName, GPCProofObjectConfig>;

  /**
   * Indicates whether the configured PODs should have unique content IDs.
   * If this is true, it enables the POD uniqueness module on the circuit level.
   */
  uniquePODs?: boolean;

  /**
   * Defines named tuples of POD entries. The tuples' names lie in a separate
   * namespace and are internally prefixed with '$tuple.'. These tuples must be
   * of arity (i.e. size/width) at least 2.
   */
  tuples?: Record<PODName, GPCProofTupleConfig>;
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
 *   eliminates any unknown fields, and also ensures that object and entry names
 *   iterate in sorted order.  This ensures that two configs which behave the
 *   same are also deep equal for easy comparison.
 *
 * Note that these steps cannot verify anything about future inputs.  In
 * particular the max POD size supported by an auto-selected circuit might
 * not be sufficient for all inputs.  If you need a larger size, you can pick
 * your circuit explicitly using the circuitIdentifier argument.
 */
export type GPCBoundConfig = GPCProofConfig & {
  /**
   * {@link GPCIdentifier} specifying a specific ZK circuit to use in proving
   * and verifying.  Same meaning as in {@link GPCProofConfig} except here it
   * is a required field.
   *
   * See {@link "@pcd/gpcircuits"!ProtoPODGPC.CIRCUIT_FAMILY} for supported circuits.)
   */
  circuitIdentifier: GPCIdentifier;
};

/**
 * Mathematical proof generated by {@link gpcProve}.  This this should be
 * treated as an opaque object.  It is serializable directly as JSON.
 *
 * Currently this is always a Groth16 proof as generated by SnarkJS, but that
 * is subject to change if different proving systems are supported in future.
 */
export type GPCProof = Groth16Proof;

/**
 * Optional part of {@link GPCProofInputs} relating to an owner's identity, which
 * at present may be either a Semaphore V3 or Semaphore V4 identity.
 */
export type GPCProofOwnerInputs = {
  /**
   * The owner's identity using Semaphore V3. This need not be specified if no
   * entry has {@link GPCProofEntryConfig.isOwnerID} equal to "SemaphoreV3".
   */
  semaphoreV3?: IdentityV3;

  /**
   * The owner's identity using Semaphore V4. This need not be specified if no
   * entry has {@link GPCProofEntryConfig.isOwnerID} equal to "SemaphoreV4".
   */
  semaphoreV4?: IdentityV4;

  /**
   * If this field is set, a nullifier hash will be calculated and revealed
   * in the proof.  The hash is uniquely tied to this value, and to the
   * owner's private identity.  This allows identifying duplicate proofs (e.g.
   * to avoid double spending or voting) without de-anonymizing the owner.
   *
   * This field can be a {@link @pcd/pod!PODValue} of any type, and will be represented
   * in the circuit as a number or a hash as appropriate.  When the proof
   * is verified, the external nullifier is also verified (as a public input).
   *
   * This field cannot be set if no entry is marked with {@link GPCProofEntryConfig.isOwnerID},
   * because such a nullifier would not be cryptographically tied to anything
   * verifiable.
   */
  externalNullifier?: PODValue;
};

/**
 * Contains the specific input data for proof.  GPC inputs tend to differ for
 * each proof, as opposed to configuration (see {@link GPCProofConfig} which
 * tends to be fixed and reusable.
 *
 * The purpose of this type is as input to {@link gpcProve}, which will
 * automatically pick a ZK circuit to fit the configuration and inputs.
 * Redacted portions of this type will be present in the resulting
 * {@link GPCRevealedClaims}.  These claims can be used to describe the contents
 * of the proof, and also passed to {@link gpcVerify} to verify the proof.
 *
 * See the documentation of the various fields and subtypes for more details.
 */
export type GPCProofInputs = {
  /**
   * PODs for each of the object included in this proof.
   *
   * The names assigned here are used to link these objects back to their
   * configuration in {@link GPCProofConfig}.  The names are not
   * cryptographically verified, but merely a convenience for configuration.
   */
  pods: Record<PODName, POD>;

  /**
   * Configuration for the "owner" of this circuit.  If included, the
   * proof will validate the given owner identity, and may optionally
   * correlate that identity to one or more POD entries to establish ownership
   * of those PODs.
   *
   * The owner's identity is never directly revealed, though POD entries which
   * contain the owner's public ID can be configured to be revealed.  A
   * nullifier can also be calculated which is tied to the owner's identity,
   * to allow identifying duplicate proofs without de-anonymizing.
   *
   * This field can be omitted if an owner is not needed for any entry
   * an entry with {@link GPCProofEntryConfig.isOwnerID} set.
   */
  owner?: GPCProofOwnerInputs;

  /*
   * Named lists of valid values for each list (non-)membership check.
   *
   * The names assigned here are used to link these lists to their
   * (non-)membership checks in {@link GPCProofEntryConfig} and {@link
   * GPCProofTupleConfig}, and their values may be primitive (i.e. of type
   * PODValue) or tuples (represented as PODValueTuple = PODValue[]).
   */
  membershipLists?: PODMembershipLists;

  /**
   * If this field is set, the given value will be included in the resulting
   * proof.  This allows identifying a proof as tied to a specific use case, to
   * avoid reuse.  Unlike a nullifier, this watermark is not cryptographically
   * tied to any specific input data.
   *
   * This field can be a {@link @pcd/pod!PODValue} of any type, and will be represented
   * in the circuit as a number or a hash as appropriate.  When the proof
   * is verified, the watermark is also verified (as a public input).
   */
  watermark?: PODValue;
};

/**
 * The part of {@link GPCRevealedClaims} claims relating to a single POD object.
 */
export type GPCRevealedObjectClaims = {
  /**
   * Redacted set of {@link PODEntries} only for the entries revealed by proof
   * configuration.  When the proof is verified, these entries are also
   * verified, while the POD's other entries remain hidden.
   *
   * Note that PODValues are represented in GPC circuits as a single number
   * and/or hash.  Values of different types can be considered identical if
   * they are numerically equal, or hash in the same way.  E.g. an `int` or
   * `cryptographic` value are considered the same if their value is equal.
   */
  entries?: PODEntries;

  /**
   * Potentially redacted content ID of this POD. The proof confirms that this
   * is computed properly.
   */
  contentID?: bigint;

  /**
   * Potentially redacted EdDSA public key of the issuer of this POD.  The proof
   * confirms that the POD has a valid signature under this key.
   */
  signerPublicKey?: string;
};

/**
 * Optional part of {@link GPCRevealedClaims} claims relating to an owner's
 * identity.
 */
export type GPCRevealedOwnerClaims = {
  /**
   * If this field is set, it matches the corresponding field in
   * {@link GPCProofInputs}, and {@link nullifierHashV3} or
   * {@link nullifierHashV4} will also be set.  The hash is uniquely tied to
   * this value, and to the owner's private identity. This allows identifying
   * duplicate proofs (e.g. to avoid double spending or voting) without
   * de-anonymizing the owner.
   *
   * This field can be a {@link @pcd/pod!PODValue} of any type, and will be represented
   * in the circuit as a number or a hash as appropriate.  When the proof
   * is verified, the external nullifier is also verified (as a public input).
   */
  externalNullifier: PODValue;

  /**
   * If set, this is a hash calculated in the proof, tied to the {@link
   * externalNullifier} value and the owner's Semaphore V3 identity.  This
   * allows identifying duplicate proofs (e.g. to avoid double spending or
   * voting) without de-anonymizing the owner.
   */
  nullifierHashV3?: bigint;

  /**
   * If set, this is a hash calculated in the proof, tied to the {@link
   * externalNullifier} value and the owner's Semaphore V4 identity.  This
   * allows identifying duplicate proofs (e.g. to avoid double spending or
   * voting) without de-anonymizing the owner.
   */
  nullifierHashV4?: bigint;
};

/**
 * Contains the public data revealed in a GPC proof.  These are redacted or
 * derived from {@link GPCProofInputs}.  GPC inputs and claims tend to differ
 * for each proof, as opposed to configuration (see {@link GPCBoundConfig} which
 * tends to be fixed and reusable.
 *
 * The purpose of this type is to describe the proof to users and to other code,
 * and to serve as input to {@link gpcVerify}, so it can verify that the proof
 * is valid and matches the claims.
 *
 * See the documentation of the various fields and subtypes for more details.
 */
export type GPCRevealedClaims = {
  /**
   * Redacted set of information revealed about each of the POD objects
   * included in the proof.
   *
   * The names assigned here are used to link these objects back to their
   * configuration in {@link GPCProofConfig}.  The names are not
   * cryptographically verified, but merely a convenience for configuration.
   */
  pods: Record<PODName, GPCRevealedObjectClaims>;

  /**
   * Revealed information about the owner specified in the proof, if any.
   *
   * The owner's identity is never directly revealed.  Instead if a nullifier
   * was calcluated, the information required to interpret it is included here.
   *
   * The owner's identity may also be linked to individual entries of each POD,
   * but this is optional as specified in configuration.  The presence or
   * absence of this field is unaffected by the entry configuration.
   */
  owner?: GPCRevealedOwnerClaims;

  /*
   * Named lists of valid values for each list (non-)membership check. These
   * values may be primitive (i.e. of type PODValue) or tuples (represented as
   * PODValueTuple = PODValue[]).  Each list must be non-empty.
   */
  membershipLists?: PODMembershipLists;

  /**
   * If this field is set, it matches the corresponding field in
   * {@link GPCProofInputs}.  This allows identifying a proof as tied to a
   * specific use case, to avoid reuse.  Unlike a nullifier, this watermark is
   * not cryptographically tied to any specific input data.
   *
   * This field can be a {@link @pcd/pod!PODValue} of any type, and will be represented
   * in the circuit as a number or a hash as appropriate.  When the proof
   * is verified, the watermark is also verified (as a public input).
   */
  watermark?: PODValue;
};

/**
 * Converts a record of membership lists to one of membership sets.
 *
 * @param membershipLists the lists to convert
 * @returns a record of membership sets
 */
export function membershipListsToSets(
  membershipLists: PODMembershipLists
): Record<PODName, Set<PODValue> | Set<PODValueTuple>> {
  return Object.fromEntries(
    Object.entries(membershipLists).map((pair) => [
      pair[0],
      new Set(pair[1] as (PODValue | PODValueTuple)[]) as
        | Set<PODValue>
        | Set<PODValueTuple>
    ])
  );
}
