import {
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDPackage,
} from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";

export async function doProveSemaphore() {
  const { prove, verify, serialize, deserialize } = SemaphoreGroupPCDPackage;

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
    zkeyFilePath: "/semaphore-artifacts/16.zkey",
    wasmFilePath: "/semaphore-artifacts/16.wasm",
  };

  const pcd = await prove(args);
  const serialized = await serialize(pcd);
  console.log(serialized);
  const deserialized = await deserialize(serialized);
  const verified = await verify(deserialized);

  console.log(verified);
}
