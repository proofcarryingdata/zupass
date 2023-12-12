import { DisplayOptions, PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { requireDefinedParameter } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";

export const SemaphoreIdentityPCDTypeName = "semaphore-identity-pcd";

export type SemaphoreIdentityPCDArgs = {
  identity: Identity;
};

export interface SemaphoreIdentityPCDClaim {
  identity: Identity;
}

export type SemaphoreIdentityPCDProof = undefined;

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

export async function prove(
  args: SemaphoreIdentityPCDArgs
): Promise<SemaphoreIdentityPCD> {
  return new SemaphoreIdentityPCD(uuid(), { identity: args.identity });
}

export async function verify(pcd: SemaphoreIdentityPCD): Promise<boolean> {
  return pcd?.claim?.identity !== undefined;
}

export async function serialize(
  pcd: SemaphoreIdentityPCD
): Promise<SerializedPCD<SemaphoreIdentityPCD>> {
  return {
    type: SemaphoreIdentityPCDTypeName,
    pcd: JSONBig.stringify({
      type: pcd.type,
      id: pcd.id,
      identity: pcd.claim.identity.toString()
    })
  } as SerializedPCD<SemaphoreIdentityPCD>;
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreIdentityPCD> {
  const { id, identity } = JSONBig.parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(identity, "identity");

  return new SemaphoreIdentityPCD(id, {
    identity: new Identity(identity)
  });
}

export function getDisplayOptions(pcd: SemaphoreIdentityPCD): DisplayOptions {
  return {
    header: "Semaphore Identity",
    displayName:
      "semaphore-id-" + pcd.claim.identity.commitment.toString().substring(0, 8)
  };
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphoreIdentityPCDPackage: PCDPackage<
  SemaphoreIdentityPCDClaim,
  SemaphoreIdentityPCDProof,
  // @ts-expect-error https://github.com/proofcarryingdata/zupass/issues/830
  SemaphoreIdentityPCDArgs
> = {
  name: SemaphoreIdentityPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
