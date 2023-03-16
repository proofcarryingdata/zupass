import { PCD, PCDPackage } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import JSONBig from "json-bigint";

export interface SemaphorePrivateKeyPCDArgs {
  privateKey: Identity;
}

export interface SemaphorePrivateKeyPCDClaim {
  privateKey: Identity;
}

export type SemaphorePrivateKeyPCDProof = undefined;

export class SemaphorePrivateKeyPCD
  implements PCD<SemaphorePrivateKeyPCDClaim, SemaphorePrivateKeyPCDProof>
{
  type = "SemaphorePrivateKeyPCD";
  claim: SemaphorePrivateKeyPCDClaim;
  proof: SemaphorePrivateKeyPCDProof;

  public constructor(claim: SemaphorePrivateKeyPCDClaim) {
    this.claim = claim;
    this.proof = undefined;
  }
}

export async function prove(
  args: SemaphorePrivateKeyPCDArgs
): Promise<SemaphorePrivateKeyPCD> {
  return new SemaphorePrivateKeyPCD({ privateKey: args.privateKey });
}

export async function verify(pcd: SemaphorePrivateKeyPCD): Promise<boolean> {
  return pcd?.claim?.privateKey !== undefined;
}

export async function serialize(pcd: SemaphorePrivateKeyPCD): Promise<string> {
  return JSONBig().stringify({
    type: pcd.type,
    privateKey: pcd.claim.privateKey.toString(),
  });
}

export async function deserialize(
  serialized: string
): Promise<SemaphorePrivateKeyPCD> {
  const parsed = JSONBig().parse(serialized);
  return new SemaphorePrivateKeyPCD({
    privateKey: new Identity(parsed.privateKey),
  });
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphorePrivateKeyPCDPackage: PCDPackage<
  SemaphorePrivateKeyPCDClaim,
  SemaphorePrivateKeyPCDProof,
  SemaphorePrivateKeyPCDArgs
> = {
  name: "SemaphorePrivateKeyPCD",
  prove,
  verify,
  serialize,
  deserialize,
};
