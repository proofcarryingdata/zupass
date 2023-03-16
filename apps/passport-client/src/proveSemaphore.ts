import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCD,
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDPackage,
  serializeSemaphoreGroup,
} from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
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
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: "1",
    },
    signal: {
      argumentType: ArgumentTypeName.BigInt,
      value: "1",
    },
    group: {
      argumentType: ArgumentTypeName.Object,
      value: serializeSemaphoreGroup(group, "test name"),
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identity })
      ),
    },
  };

  const pcd = await prove(args);
  console.log("Generated identity-revealing proof", pcd);
  return pcd;
}
