import {
  PCD,
  PCDArgument,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";

export const EthereumOwnershipPCDTypeName = "ethereum-ownership-pcd";

export interface EthereumOwnershipPCDInitArgs {
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;
}

export type EthereumOwnershipPCDArgs = {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  ethereumAddress: StringArgument;
  ethereumSignatureOfCommitment: StringArgument;
};

export interface EthereumOwnershipPCDClaim {
  /**
   * 0x...
   */
  ethereumAddress: string;
}

export interface EthereumOwnershipPCDProof {
  signatureProof: SerializedPCD<SemaphoreSignaturePCD>;
  ethereumSignatureOfCommitment: string;
}

export class EthereumOwnershipPCD
  implements PCD<EthereumOwnershipPCDClaim, EthereumOwnershipPCDProof>
{
  type = EthereumOwnershipPCDTypeName;
  claim: EthereumOwnershipPCDClaim;
  proof: EthereumOwnershipPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: EthereumOwnershipPCDClaim,
    proof: EthereumOwnershipPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
