import { POD, PODEntries, PODName, PODValue, PODValueTuple } from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";
import { Groth16Proof } from "snarkjs";

/**
 * String specifying a named entry in a named object, in the format
 * `objectName.entryName`.  Each of the sub-parts should be a valid PODName,
 * checked by {@link POD_NAME_REGEX}.
 */
export type PODEntryIdentifier = `${PODName}.${PODName}`;

/**
 * Optional set of lists for checking POD entry (or tuple) value membership.
 */
export type PODMembershipLists = Record<PODName, PODValue[] | PODValueTuple[]>;

// Single source of truth for tuple prefix (used internally).
// This should not be a valid {@link PODName} to avoid name clashes.
export const TUPLE_PREFIX = "$tuple";
type TuplePrefix = "$tuple";

/**
 * String specifying a named tuple in the format `tuple.tupleName`.
 * `tupleName` should be a valid PODName checked by {@link POD_NAME_REGEX}.
 */
export type TupleIdentifier = `${TuplePrefix}.${PODName}`;

/**
 * String specifying a specific GPC circuit, identified by its family name
 * and circuit name.
 */
export type GPCIdentifier = `${string}_${string}`;

/**
 * GPCProofConfig for a single POD entry, specifying which featuers and
 * constraints should be enabled for that entry.
 */
export type GPCProofEntryConfig = {
  /**
   * Indicates whether this entry should be revealed in the proof.  Setting
   * this to `true` will result in the entry's value being included in
   * {@link GPCRevealedClaims}, and its hash being verified in
   * {@link gpcVerify}.
   */
  isRevealed: boolean;

  /**
   * Indicates that this entry must match the public ID of the owner
   * identity given in {@link GPCProofInputs}.  For Semaphore V3 this is
   * the owner's Semaphore commitment (a cryptographic value).
   *
   * Comparison in the proof circuit is based on the hash produced by
   * {@link podValueHash}.  This means values of different types can be
   * considered equal if they are treated in the same way by circuits.
   *
   * If undefined or false, there is no owner-related constraint on this entry.
   *
   * This feature cannot be combined with `equalsEntry` on the same entry (since
   * it shares the same constraints in the circuit).  However since equality
   * constraints can be specified in either direction, you can still constrain
   * an owner entry by specifying it on the non-owner entry.
   */
  isOwnerID?: boolean;

  /**
   * Indicates that this entry must be equal to another entry.  The other
   * entry is specified by a 2-part {@link PODEntryIdentifier} string
   * used to find the entry in one of the pods in {@link GPCProofInputs}.
   *
   * Comparison in the proof circuit is based on the hash produced by
   * {@link podValueHash}.  This means values of different types can be
   * considered equal if they are treated in the same way by circuits.
   *
   * If undefined, there is no equality constraint.
   *
   * This feature cannot be combined with `isOwnerID` on the same entry (since
   * it shares the same constraints in the circuit).  However since equality
   * constraints can be specified in either direction, you can still constrain
   * an owner entry by specifying it on the non-owner entry.
   */
  equalsEntry?: PODEntryIdentifier;

  /**
   * Indicates list(s) in which this entry must lie. An entry value may lie in
   * one or more membership lists.
   *
   * Note that the underlying GPC expects a one-to-one correspondence between
   * comparison values and lists, i.e. it will only check one value per
   * list. Thus, if multiple entry values are constrained to be members of some
   * fixed list, this list will be duplicated for each of these checks,
   * increasing the circuit size requirements. This should be taken into account
   * when estimating circuit sizes.
   */
  isMemberOf?: PODName | PODName[];

  // TODO(POD-P3): Constraints on entry values can go here.  Lower/upper bounds,
  // comparison to constant, etc.
  // TODO(POD-P3): Think about where to represent "filtering" inputs in
  // public ways.  E.g. comparison to a constant requires revealing anyway,
  // so isn't handled by this layer for now, but that could be a convenience
  // feature for use cases where the verifier uses a hard-coded config.
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

  // TODO(POD-P3): Is there anything to configure at this level?  Or can we
  // collapose it?
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
   * Indicates lists in which this entry must lie. A tuple may lie in one or
   * more lists. See {@link GPCProofEntryConfig} regarding circuit size
   * considerations.
   */
  isMemberOf?: PODName | PODName[];
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
   * See {@link ProtoPODGPC.CIRCUIT_FAMILY} for supported circuits.)
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
   * See {@link ProtoPODGPC.CIRCUIT_FAMILY} for supported circuits.)
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
 * Optional part of {@link GPCProofInputs} relating to an owner's identity.
 */
export type GPCProofOwnerInputs = {
  /**
   * The owner's identity using Semaphore V3.  In future, alternative owner
   * identity types may be supported, and this will become an optional field.
   * This will be ignored if no entry is marked with {@link isOwnerID}.
   */
  semaphoreV3: Identity;

  /**
   * If this field is set, a nullifier hash will be calculated and revealed
   * in the proof.  The hash is uniquely tied to this value, and to the
   * owner's private identity.  This allows identifying duplicate proofs (e.g.
   * to avoid double spending or voting) without de-anonymizing the owner.
   *
   * This field can be a {@link PODValue} of any type, and will be represented
   * in the circuit as a number or a hash as appropriate.  When the proof
   * is verified, the external nullifier is also verified (as a public input).
   *
   * This field cannot be set if no entry is marked with {@link isOwnerID},
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
   * an entry with {@link isOwnerID} set.
   */
  owner?: GPCProofOwnerInputs;

  /*
   * Named lists of valid values for each list membership check. These values
   * may be primitive (i.e. of type PODValue) or tuples (represented as
   * PODValueTuple = PODValue[]).  Each list must be non-empty.
   */
  membershipLists?: PODMembershipLists;

  /**
   * If this field is set, the given value will be included in the resulting
   * proof.  This allows identifying a proof as tied to a specific use case, to
   * avoid reuse.  Unlike a nullifier, this watermark is not cryptographically
   * tied to any specific input data.
   *
   * This field can be a {@link PODValue} of any type, and will be represented
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
   * The EdDSA public key of the isuer of this POD.  The proof confirms
   * that the POD has a valid signature under this key.
   */
  signerPublicKey: string;
};

/**
 * Optional part of {@link GPCRevealedClaims} claims relating to an owner's
 * identity.
 */
export type GPCRevealedOwnerClaims = {
  /**
   * If this field is set, it matches the corresponding field in
   * {@link GPCProofInputs}, and {@link nullifierHash} will also be set.  The
   * hash is uniquely tied to this value, and to the owner's private identity.
   * This allows identifying duplicate proofs (e.g. to avoid double spending
   * or voting) without de-anonymizing the owner.
   *
   * This field can be a {@link PODValue} of any type, and will be represented
   * in the circuit as a number or a hash as appropriate.  When the proof
   * is verified, the external nullifier is also verified (as a public input).
   */
  externalNullifier: PODValue;

  /**
   * If set, this is a hash calculated in the proof, tied to the
   * {@link externalNullifier} value and the owner's identity.  This allows
   * identifying duplicate proofs (e.g. to avoid double spending or voting)
   * without de-anonymizing the owner.
   */
  nullifierHash: bigint;
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
   * Named lists of valid values for each list membership check. These values
   * may be primitive (i.e. of type PODValue) or tuples (represented as
   * PODValueTuple = PODValue[]).  Each list must be non-empty.
   */
  membershipLists?: PODMembershipLists;

  /**
   * If this field is set, it matches the corresponding field in
   * {@link GPCProofInputs}.  This allows identifying a proof as tied to a
   * specific use case, to avoid reuse.  Unlike a nullifier, this watermark is
   * not cryptographically tied to any specific input data.
   *
   * This field can be a {@link PODValue} of any type, and will be represented
   * in the circuit as a number or a hash as appropriate.  When the proof
   * is verified, the watermark is also verified (as a public input).
   */
  watermark?: PODValue;
};
