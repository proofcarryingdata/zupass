import { PCD, PCDPackage } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import JSONBig from "json-bigint";

export interface SemaphoreIdentityPCDArgs {
  identity: Identity;
}

export interface SemaphoreIdentityPCDClaim {
  identity: Identity;
}

export type SemaphoreIdentityPCDProof = undefined;

export class SemaphoreIdentityPCD
  implements PCD<SemaphoreIdentityPCDClaim, SemaphoreIdentityPCDProof>
{
  type = "SemaphoreIdentityPCD";
  claim: SemaphoreIdentityPCDClaim;
  proof: SemaphoreIdentityPCDProof;

  public constructor(claim: SemaphoreIdentityPCDClaim) {
    this.claim = claim;
    this.proof = undefined;
  }
}

export async function prove(
  args: SemaphoreIdentityPCDArgs
): Promise<SemaphoreIdentityPCD> {
  return new SemaphoreIdentityPCD({ identity: args.identity });
}

export async function verify(pcd: SemaphoreIdentityPCD): Promise<boolean> {
  return pcd?.claim?.identity !== undefined;
}

export async function serialize(pcd: SemaphoreIdentityPCD): Promise<string> {
  return JSONBig.stringify({
    type: pcd.type,
    identity: pcd.claim.identity.toString(),
  });
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreIdentityPCD> {
  const parsed = JSONBig.parse(serialized);
  return new SemaphoreIdentityPCD({
    identity: new Identity(parsed.identity),
  });
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphoreIdentityPCDPackage: PCDPackage<
  SemaphoreIdentityPCDClaim,
  SemaphoreIdentityPCDProof,
  SemaphoreIdentityPCDArgs
> = {
  name: "SemaphoreIdentityPCD",
  prove,
  verify,
  serialize,
  deserialize,
};
