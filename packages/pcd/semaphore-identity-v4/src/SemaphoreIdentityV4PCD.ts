import { PCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";

export const SemaphoreIdentityV4PCDTypeName = "semaphore-identity-v4-pcd";

export type SemaphoreIdentityV4PCDArgs = {
  identity: Identity;
};

export interface SemaphoreIdentityV4PCDClaim {
  identity: Identity;
}

export type SemaphoreIdentityV4PCDProof = undefined;

export function isSemaphoreIdentityV4PCD(
  pcd: PCD
): pcd is SemaphoreIdentityV4PCD {
  return pcd.type === SemaphoreIdentityV4PCDTypeName;
}

export class SemaphoreIdentityV4PCD
  implements PCD<SemaphoreIdentityV4PCDClaim, SemaphoreIdentityV4PCDProof>
{
  type = SemaphoreIdentityV4PCDTypeName;
  claim: SemaphoreIdentityV4PCDClaim;
  proof: SemaphoreIdentityV4PCDProof;
  id: string;

  public constructor(id: string, claim: SemaphoreIdentityV4PCDClaim) {
    this.claim = claim;
    this.proof = undefined;
    this.id = id;
  }
}
