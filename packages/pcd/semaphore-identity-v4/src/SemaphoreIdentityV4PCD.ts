import { PCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";

export const SemaphoreIdentityV4PCDTypeName = "semaphore-identity-v4-pcd";

/**
 * @param identity - The semaphore v4 identity to be stored in the PCD.
 */
export type SemaphoreIdentityV4PCDArgs = {
  identity: Identity;
};

/**
 * @param identity - The semaphore v4 identity represented by the PCD.
 */
export interface SemaphoreIdentityV4PCDClaim {
  identity: Identity;
}

export type SemaphoreIdentityV4PCDProof = undefined;

/**
 * @returns true if the PCD is a semaphore identity v4 PCD.
 */
export function isSemaphoreIdentityV4PCD(
  pcd: PCD
): pcd is SemaphoreIdentityV4PCD {
  return pcd.type === SemaphoreIdentityV4PCDTypeName;
}

/**
 * A PCD representing a semaphore v4 identity.
 */
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
