import {
  SemaphoreGroupPCD,
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDPackage,
} from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";

// Create a PCD proving that we own a given semaphore identity.
export async function createProof(
  identity: Identity
): Promise<SemaphoreGroupPCD> {
  const { prove } = SemaphoreGroupPCDPackage;

  // TODO: replace this with a group of depth 0 -- only needs 2^0=1 members.
  const group = new Group(1, 16);
  group.addMember(identity.commitment);

  const args: SemaphoreGroupPCDArgs = {
    externalNullifier: BigInt(1),
    signal: BigInt(1),
    group,
    identity,
    zkeyFilePath: "/semaphore-artifacts/16.zkey",
    wasmFilePath: "/semaphore-artifacts/16.wasm",
  };

  const pcd = await prove(args);
  console.log("Generated identity-revealing proof", pcd);
  return pcd;
}
