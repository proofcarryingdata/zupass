import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { requireDefinedParameter } from "@pcd/util";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDArgs,
  SemaphoreIdentityPCDClaim,
  SemaphoreIdentityPCDProof,
  SemaphoreIdentityPCDTypeName
} from "./SemaphoreIdentityPCD";
import { v3tov4Identity } from "./v4IdentityUtils";

export async function prove(
  args: SemaphoreIdentityPCDArgs
): Promise<SemaphoreIdentityPCD> {
  return new SemaphoreIdentityPCD(uuid(), {
    identityV3: args.identityV3,
    identityV4: v3tov4Identity(args.identityV3)
  });
}

export async function verify(pcd: SemaphoreIdentityPCD): Promise<boolean> {
  return pcd?.claim?.identityV3 !== undefined;
}

export async function serialize(
  pcd: SemaphoreIdentityPCD
): Promise<SerializedPCD<SemaphoreIdentityPCD>> {
  return {
    type: SemaphoreIdentityPCDTypeName,
    pcd: JSONBig.stringify({
      type: pcd.type,
      id: pcd.id,
      // note this is the v3 identity, but is not named
      // 'identityV3' in the serialized format for backwards
      // compatibility
      identity: pcd.claim.identityV3.toString()
    })
  } as SerializedPCD<SemaphoreIdentityPCD>;
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreIdentityPCD> {
  const { id, identity } = JSONBig.parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(identity, "identity");

  const v3Identity = new IdentityV3(identity);
  return new SemaphoreIdentityPCD(id, {
    identityV3: v3Identity,
    identityV4: v3tov4Identity(v3Identity)
  });
}

export function getDisplayOptions(pcd: SemaphoreIdentityPCD): DisplayOptions {
  return {
    header: "Semaphore Identity",
    displayName:
      "semaphore-id-" +
      pcd.claim.identityV3.commitment.toString().substring(0, 8)
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
