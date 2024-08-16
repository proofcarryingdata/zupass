import { PCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";

export const SemaphoreIdentityPCDTypeName = "semaphore-identity-pcd";

export type SemaphoreIdentityPCDArgs = {
  identity: Identity;
};

export interface SemaphoreIdentityPCDClaim {
  identity: Identity;
}

export type SemaphoreIdentityPCDProof = undefined;

export function isSemaphoreIdentityPCD(pcd: PCD): pcd is SemaphoreIdentityPCD {
  return pcd.type === SemaphoreIdentityPCDTypeName;
}

export class SemaphoreIdentityPCD
  implements PCD<SemaphoreIdentityPCDClaim, SemaphoreIdentityPCDProof>
{
  type = SemaphoreIdentityPCDTypeName;
  claim: SemaphoreIdentityPCDClaim;
  proof: SemaphoreIdentityPCDProof;
  id: string;

  public constructor(id: string, claim: SemaphoreIdentityPCDClaim) {
    this.claim = claim;
    this.proof = undefined;
    this.id = id;
  }
}
