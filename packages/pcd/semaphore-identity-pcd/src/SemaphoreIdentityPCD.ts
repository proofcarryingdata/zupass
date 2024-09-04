import { PCD } from "@pcd/pcd-types";
import { Identity as IdentityV4 } from "@semaphore-protocol/core";
import { Identity } from "@semaphore-protocol/identity";
import { v3tov4Identity } from "./v4IdentityUtils";

export const SemaphoreIdentityPCDTypeName = "semaphore-identity-pcd";

export type SemaphoreIdentityPCDArgs = {
  identity: Identity;
};

export interface SemaphoreIdentityPCDClaim {
  identity: Identity;
  identityV4: IdentityV4;
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

    if (v3tov4Identity(claim.identity).export() !== claim.identityV4.export()) {
      throw new Error("v3tov4Identity(claim.identity) !== claim.identityV4");
    }
  }
}
