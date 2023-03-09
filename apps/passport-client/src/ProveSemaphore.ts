import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import {
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDPackage,
} from "semaphore-group-pcd";

export async function doProveSemaphore() {
  const { prove, verify } = SemaphoreGroupPCDPackage;

  const identity = new Identity();
  const group = new Group(1, 16);
  group.addMember(identity.commitment);
  const externalNullifier = group.root;
  const signal = 1;

  const args: SemaphoreGroupPCDArgs = {
    externalNullifier: BigInt(externalNullifier),
    signal: BigInt(signal),
    group,
    identity,
  };

  const pcd = await prove(args);
  const verified = await verify(pcd);

  console.log(verified);
}
