import { PCD, PCDArgument, StringArgument } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { PackedProof } from "@semaphore-protocol/proof";

export const SemaphoreSignaturePCDTypeName = "semaphore-signature-pcd";

export interface SemaphoreSignaturePCDInitArgs {
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;
}

// We hardcode the externalNullifer to also be your identityCommitment
// so that your nullifier for specific groups is not revealed when
// a SemaphoreSignaturePCD is requested from a consumer application.
export type SemaphoreSignaturePCDArgs = {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  signedMessage: StringArgument;
};

export interface SemaphoreSignaturePCDClaim {
  /**
   * Pre-hashed message.
   */
  signedMessage: string;

  /**
   * Stringified `BigInt`.
   */
  identityCommitment: string;

  /**
   * Stringified `BigInt`.
   */
  nullifierHash: string;
}

export type SemaphoreSignaturePCDProof = PackedProof;
export class SemaphoreSignaturePCD
  implements PCD<SemaphoreSignaturePCDClaim, SemaphoreSignaturePCDProof>
{
  type = SemaphoreSignaturePCDTypeName;
  claim: SemaphoreSignaturePCDClaim;
  proof: SemaphoreSignaturePCDProof;
  id: string;

  public constructor(
    id: string,
    claim: SemaphoreSignaturePCDClaim,
    proof: SemaphoreSignaturePCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
