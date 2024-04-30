import { PCD, StringArgument, StringArrayArgument } from "@pcd/pcd-types";

/**
 * The globally unique type name of the {@link EdDSAPCD}.
 */
export const EdDSAPCDTypeName = "eddsa-pcd";

/**
 * An EdDSA public key is represented as a point on the elliptic curve, with each point being
 * a pair of coordinates consisting of hexadecimal strings. The public key is maintained in a standard
 * format and is internally converted to and from the Montgomery format as needed.
 */
export type EdDSAPublicKey = [string, string] | string;

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 * It is empty because this package does not implement the `init` function.
 */
export interface EdDSAInitArgs {}

/**
 * Defines the essential parameters required for creating an {@link EdDSAPCD}.
 */
export type EdDSAPCDArgs = {
  /**
   * The EdDSA private key is a 32-byte value used to sign the message.
   * {@link newEdDSAPrivateKey} is recommended for generating highly secure private keys.
   */
  privateKey: StringArgument;

  /**
   * The message is composed of a list of stringified big integers so that both `proof` and `claim`
   * can also be used within SNARK circuits, which operate on fields that are themselves big integers.
   */
  message: StringArrayArgument;

  /**
   * A string that uniquely identifies an {@link EdDSAPCD}. If this argument is not specified a random
   * id will be generated.
   */
  id: StringArgument;
};

/**
 * Defines the EdDSA PCD claim. The claim contains a message signed
 * with the private key corresponding to the given public key.
 */
export interface EdDSAPCDClaim {
  /**
   * An EdDSA public key corresponding to the EdDSA private key used
   * for signing the message.
   */
  publicKey: EdDSAPublicKey;

  /**
   * A list of big integers that were signed with the corresponding private key.
   */
  message: Array<bigint>;
}

/**
 * Defines the EdDSA PCD proof. The proof is the signature that proves
 * that the private key corresponding to the public key in the claim has been successfully
 * used to sign the message.
 */
export interface EdDSAPCDProof {
  /**
   * The EdDSA signature of the message as a hexadecimal string.
   */
  signature: string;
}

/**
 * The EdDSA PCD enables the verification that a specific message has been signed with an
 * EdDSA private key. The {@link EdDSAPCDProof}, serving as the signature, is verified
 * using the {@link EdDSAPCDClaim}, which consists of the EdDSA public key and the message.
 */
export class EdDSAPCD implements PCD<EdDSAPCDClaim, EdDSAPCDProof> {
  public type = EdDSAPCDTypeName;

  public id: string;
  public claim: EdDSAPCDClaim;
  public proof: EdDSAPCDProof;

  public constructor(id: string, claim: EdDSAPCDClaim, proof: EdDSAPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
