import { PCD, StringArgument } from "@pcd/pcd-types";

export const RSAPCDTypeName = "rsa-pcd";

export type RSAPCDArgs = {
  privateKey: StringArgument;
  signedMessage: StringArgument;
  id: StringArgument;
};

export interface RSAPCDClaim {
  /**
   * Message that was signed by the RSA private key corresponding to
   * {@link RSAPCDProof#publicKey}.
   */
  message: string;
}

export interface RSAPCDProof {
  /**
   * RSA public key corresponding to the private key which signed
   * {@link RSAPCDClaim#message}.
   */
  publicKey: string;

  /**
   * The signature of {@link RSAPCDClaim#message} with the RSA
   * private key corresponding to {@link RSAPCDProof#publicKey}
   */
  signature: string;
}

export class RSAPCD implements PCD<RSAPCDClaim, RSAPCDProof> {
  type = RSAPCDTypeName;
  claim: RSAPCDClaim;
  proof: RSAPCDProof;
  id: string;

  public constructor(id: string, claim: RSAPCDClaim, proof: RSAPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
