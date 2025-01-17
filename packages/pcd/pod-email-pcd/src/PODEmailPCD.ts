import type { PCD, StringArgument } from "@pcd/pcd-types";
import type {
  PODEdDSAPublicKeyValue,
  PODEntries,
  PODStringValue
} from "@pcd/pod";

export const PODEmailPCDTypeName = "pod-email-pcd";

export type PODEmailPCDArgs = {
  /**
   * The signer's EdDSA private key.  This is a 32-byte value used to sign the
   * message.  See {@link @pcd/pod!decodePrivateKey} in `@pcd/pod` if you need
   * to manipulate or convert this value.
   */
  privateKey: StringArgument;

  /**
   * The verified email address
   */
  emailAddress: StringArgument;

  /**
   * The signer's semaphore v4 public key
   * @todo link to documentation on public key format
   */
  semaphoreV4PublicKey: StringArgument;

  /**
   * A unique string identifying the PCD
   */
  id: StringArgument;
};

export type PODEmailPCDRequiredEntries = {
  emailAddress: PODStringValue;
  semaphoreV4PublicKey: PODEdDSAPublicKeyValue;
};

export interface PODEmailPCDClaim {
  podEntries: PODEntries & PODEmailPCDRequiredEntries;
  signerPublicKey: string;
}

export interface PODEmailPCDProof {
  signature: string;
}

export class PODEmailPCD implements PCD<PODEmailPCDClaim, PODEmailPCDProof> {
  type = PODEmailPCDTypeName;
  claim: PODEmailPCDClaim;
  proof: PODEmailPCDProof;
  id: string;

  constructor(id: string, claim: PODEmailPCDClaim, proof: PODEmailPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
