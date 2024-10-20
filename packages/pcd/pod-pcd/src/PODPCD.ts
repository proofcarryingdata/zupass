import { ObjectArgument, PCD, StringArgument } from "@pcd/pcd-types";
import { JSONPODEntries, POD, PODEntries } from "@pcd/pod";

/**
 * A set of entries defining a POD, represented in an object.  See `@pcd/pod`
 * for full definition and documentation.
 */
export type { PODEntries } from "@pcd/pod";

/**
 * The globally unique type name of the {@link PODPCD}.
 */
export const PODPCDTypeName = "pod-pcd";

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 *
 * This package does not implement the `init` function.
 */
export type PODPCDInitArgs = unknown;

/**
 * Defines the essential parameters required for creating a {@link PODPCD}.
 */
export type PODPCDArgs = {
  /**
   * A {@link ITicketData} object containing ticket information that is encoded into this PCD.
   */
  entries: ObjectArgument<JSONPODEntries>;

  /**
   * The signer's EdDSA private key.  This is a 32-byte value used to sign the
   * message.  {@link newEdDSAPrivateKey} is recommended for generating highly
   * secure private keys.
   */
  privateKey: StringArgument;

  /**
   * A string that uniquely identifies an {@link PODPCD}. If this argument is
   * not specified a random id will be generated.
   *
   * This ID is not cryptographically verified by the POD.  An issuer can choose
   * to include the ID in an entry of the POD to do so, but this PCD type
   * doesn't link its ID to any such entry.
   */
  id: StringArgument;
};

/**
 * Defines the POD PCD's claim.  A POD claims its entries an signature.
 * The content ID which is signed is derivable from the entries, and not
 * included directly in the claims.
 */
export interface PODPCDClaim {
  /**
   * The entries of this POD, in sorted order as they are Merklized.
   * See the {@link pod} accessor on {@link PODPCD} if you need to manipulate
   * these entries as a POD object.
   */
  entries: PODEntries;

  /**
   * The EdDSA public key of the signer of this pod, in a packed string form.
   * See {@link decodePublicKey} in `@pcd/pod` if you need to manipulate or
   * convert this value.
   */
  signerPublicKey: string;
}

/**
 * Defines the POD PCD proof. The proof is an EdDSA signature on the POD's
 * content ID, which is derived from the entries.
 */
export interface PODPCDProof {
  /**
   * The EdDSA signature of this POD's content ID, in a packed string form.
   * See {@link decodeSignature} in `@pcd/pod` if you need to manipulate
   * or convert this value.
   */
  signature: string;
}

/**
 * The POD PCD enables the verification that a specific set of POD entries
 * has been signed with an EdDSA private key. The {@link PODPCDClaim} contains
 * the entries and public key, while the {@link PODPCDProof} contains the
 * signature.
 *
 * All operations are coordinated via a `POD` object available as `pcd.pod`.
 * This object generates derived data (such as the Merkle tree and content ID)
 * lazily as needed.
 *
 * Note that a POD PCD is not intended to be mutable.  The `POD` object is not
 * updated after the PCD is proven or deserialized.
 */
export class PODPCD implements PCD<PODPCDClaim, PODPCDProof> {
  type = PODPCDTypeName;
  claim: PODPCDClaim;
  proof: PODPCDProof;
  id: string;

  private _pod: POD;

  /**
   * Gets a POD object for manipulating this PCD's content.
   */
  public get pod(): POD {
    return this._pod;
  }

  /**
   * Create a PCD to encapsulate the given ID and POD object.
   */
  public constructor(id: string, pod: POD) {
    this.id = id;
    this.claim = {
      entries: pod.content.asEntries(),
      signerPublicKey: pod.signerPublicKey
    };
    this.proof = { signature: pod.signature };
    this._pod = pod;
  }
}

/**
 * Convenience function for checking the type of a PODPCD.
 */
export function isPODPCD(pcd: PCD): pcd is PODPCD {
  return pcd.type === PODPCDTypeName;
}
