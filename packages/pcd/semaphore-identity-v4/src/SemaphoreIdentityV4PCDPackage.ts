import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { requireDefinedParameter } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  SemaphoreIdentityV4PCD,
  SemaphoreIdentityV4PCDArgs,
  SemaphoreIdentityV4PCDClaim,
  SemaphoreIdentityV4PCDProof,
  SemaphoreIdentityV4PCDTypeName
} from "./SemaphoreIdentityV4PCD";

export async function prove(
  args: SemaphoreIdentityV4PCDArgs
): Promise<SemaphoreIdentityV4PCD> {
  return new SemaphoreIdentityV4PCD(uuid(), { identity: args.identity });
}

export async function verify(pcd: SemaphoreIdentityV4PCD): Promise<boolean> {
  return pcd?.claim?.identity !== undefined;
}

export async function serialize(
  pcd: SemaphoreIdentityV4PCD
): Promise<SerializedPCD<SemaphoreIdentityV4PCD>> {
  return {
    type: SemaphoreIdentityV4PCDTypeName,
    pcd: JSONBig.stringify({
      type: pcd.type,
      id: pcd.id,
      identity: pcd.claim.identity.export()
    })
  } as SerializedPCD<SemaphoreIdentityV4PCD>;
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreIdentityV4PCD> {
  const { id, identity } = JSONBig.parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(identity, "identity");

  return new SemaphoreIdentityV4PCD(id, {
    identity: Identity.import(identity)
  });
}

export function getDisplayOptions(pcd: SemaphoreIdentityV4PCD): DisplayOptions {
  return {
    header: "Semaphore Identity V4",
    displayName:
      "semaphore-id-v4-" +
      pcd.claim.identity.commitment.toString().substring(0, 8)
  };
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol (v4). You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphoreIdentityV4PCDPackage: PCDPackage<
  SemaphoreIdentityV4PCDClaim,
  SemaphoreIdentityV4PCDProof,
  // @ts-expect-error https://github.com/proofcarryingdata/zupass/issues/830
  SemaphoreIdentityV4PCDArgs
> = {
  name: SemaphoreIdentityV4PCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
