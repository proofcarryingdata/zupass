import { PCD, StringArgument } from "@pcd/pcd-types";
import type { PODPCDProof } from "@pcd/pod-pcd";

export const EmailPCDTypeName = "email-pcd";

export type EmailPCDArgs = {
  // The EdDSA private key to sign the message with, as a hex string
  privateKey: StringArgument;
  // the verified email address
  emailAddress: StringArgument;
  // semaphore ID
  semaphoreId: StringArgument;
  // A unique string identifying the PCD
  id: StringArgument;
};

export interface EmailPCDClaim {
  emailAddress: string;
  semaphoreId: string; // stringified big int
  signerPublicKey: string;
}

export type EmailPCDProof = PODPCDProof;

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
