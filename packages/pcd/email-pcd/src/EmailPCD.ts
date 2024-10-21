import { EdDSAPCD } from "@pcd/eddsa-pcd";
import { PCD, StringArgument } from "@pcd/pcd-types";

export const EmailPCDTypeName = "email-pcd";

export type EmailPCDArgs = {
  // The EdDSA private key to sign the message with, as a hex string
  privateKey: StringArgument;
  // the verified email address
  emailAddress: StringArgument;
  // semaphore v3 ID
  semaphoreId: StringArgument;
  // semaphore v4 ID
  semaphoreV4Id: StringArgument;
  // A unique string identifying the PCD
  id: StringArgument;
};

export interface EmailPCDClaim {
  emailAddress: string;
  semaphoreId: string; // stringified big int
  // stringified big int. optional because a user does not have their v4 ID until they migrate
  semaphoreV4Id?: string;
}

export interface EmailPCDProof {
  eddsaPCD: EdDSAPCD; // eddsa signature of {@link EmailPCDClaim.email}
}

export class EmailPCD implements PCD<EmailPCDClaim, EmailPCDProof> {
  type = EmailPCDTypeName;
  claim: EmailPCDClaim;
  proof: EmailPCDProof;
  id: string;

  public constructor(id: string, claim: EmailPCDClaim, proof: EmailPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export const isEmailPCD = (pcd: PCD<unknown, unknown>): pcd is EmailPCD =>
  pcd.type === EmailPCDTypeName;
