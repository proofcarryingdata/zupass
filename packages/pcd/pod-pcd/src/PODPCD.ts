import {
  DisplayOptions,
  ObjectArgument,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import { POD, PODEntries } from "@pcd/pod";
import { requireDefinedParameter } from "@pcd/util";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";

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
 * It is empty because this package does not implement the `init` function.
 */
export interface PODPCDInitArgs {}

/**
 * Defines the essential parameters required for creating a {@link PODPCD}.
 */
export type PODPCDArgs = {
  /**
   * A {@link ITicketData} object containing ticket information that is encoded into this PCD.
   */
  entries: ObjectArgument<PODEntries>;
  // TODO(artwyman): Figure out if ObjectArgument works here.
  // May be better to be a serialized string, or an array, or a custom type
  // without bigints, depending on the needs of the prove screen.

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
 * Creates a new {@link PODPCD} by generating an {@link PODPCDProof}
 * and deriving an {@link PODPCDClaim} from the given {@link PODPCDArgs}.
 *
 * @throws if the arguments are invalid
 */
export async function prove(args: PODPCDArgs): Promise<PODPCD> {
  if (!args.privateKey.value) throw new Error("No private key value provided");
  if (!args.entries.value) throw new Error("No POD entries value provided");
  const id = typeof args.id.value === "string" ? args.id.value : uuid();

  const pod = POD.sign(args.entries.value, args.privateKey.value);
  return new PODPCD(id, pod);
}

/**
 * Verifies a POD PCD by checking that its {@link PODPCDClaim} corresponds to
 * its {@link PODPCDProof}.  If the signature is valid and matches the entries,
 * the function returns true, otherwise false.
 */
export async function verify(pcd: PODPCD): Promise<boolean> {
  try {
    return pcd.pod.verifySignature();
  } catch (e) {
    console.error("Verifying invalid POD data:", e);
    return false;
  }
}

/**
 * Serializes a {@link PODPCD}.
 * @param pcd The POD PCD to be serialized.
 * @returns The serialized version of the POD PCD.
 */
export async function serialize(pcd: PODPCD): Promise<SerializedPCD<PODPCD>> {
  return {
    type: PODPCDTypeName,
    pcd: JSONBig({
      useNativeBigInt: true,
      alwaysParseAsBig: true
    }).stringify({
      id: pcd.id,
      claim: pcd.claim,
      proof: pcd.proof
    })
  };
}

/**
 * Deserializes a serialized {@link PODPCD}.
 * @param serialized The serialized PCD to deserialize.
 * @returns The deserialized version of the POD PCD.
 */
export async function deserialize(serialized: string): Promise<PODPCD> {
  const deserialized = JSONBig({
    useNativeBigInt: true,
    alwaysParseAsBig: true
  }).parse(serialized);

  // TODO(artwyman): More careful schema validation, likely with Zod, with
  // special handling of the PODEntries type and subtypes.
  // TODO(artwyman): Backward-compatible schema versioning.
  requireDefinedParameter(deserialized.id, "id");
  requireDefinedParameter(deserialized.claim, "claim");
  requireDefinedParameter(deserialized.claim.entries, "entries");
  requireDefinedParameter(
    deserialized.claim.signerPublicKey,
    "signerPublicKey"
  );
  requireDefinedParameter(deserialized.proof, "proof");
  requireDefinedParameter(deserialized.proof.signature, "signature");

  const loadedPOD = POD.load(
    deserialized.claim.entries,
    deserialized.proof.signature,
    deserialized.claim.signerPublicKey
  );

  return new PODPCD(deserialized.id, loadedPOD);
}

/**
 * Provides the information about the {@link PODPCD} that will be displayed
 * to users on Zupass.
 * @param pcd The POD PCD instance.
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(
  // TODO(artwyman): Figure out why this is the only case where using PODPCD directly doesn't work
  pcd: PCD<PODPCDClaim, PODPCDProof>
): DisplayOptions {
  return {
    header: "POD",
    displayName: "pod-" + pcd.id
  };
}

/**
 * The PCD package of the EdDSA PCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const PODPCDPackage: PCDPackage<
  PODPCDClaim,
  PODPCDProof,
  PODPCDArgs,
  PODPCDInitArgs
> = {
  name: PODPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
