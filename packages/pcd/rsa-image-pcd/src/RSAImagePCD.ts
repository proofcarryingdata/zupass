import { PCD, StringArgument } from "@pcd/pcd-types";
import { RSAPCD } from "@pcd/rsa-pcd";

export const RSAImagePCDTypeName = "rsa-image-pcd";

export type RSAImagePCDArgs = {
  privateKey: StringArgument;
  id: StringArgument;
  url: StringArgument;
  title: StringArgument;
};

export interface RSAImagePCDClaim {}

export interface RSAImagePCDProof {
  rsaPCD: RSAPCD;
}

export class RSAImagePCD implements PCD<RSAImagePCDClaim, RSAImagePCDProof> {
  type = RSAImagePCDTypeName;
  claim: RSAImagePCDClaim;
  proof: RSAImagePCDProof;
  id: string;

  public constructor(
    id: string,
    claim: RSAImagePCDClaim,
    proof: RSAImagePCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
