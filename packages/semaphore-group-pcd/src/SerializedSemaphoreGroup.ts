import { Group } from "@semaphore-protocol/group";

export interface SerializedSemaphoreGroup {
  id: string;
  name: string;
  members: string[];
  depth: number;
  zeroValue: string;
}

export function serializeSemaphoreGroup(
  group: Group,
  name: string
): SerializedSemaphoreGroup {
  return {
    id: group.id.toString(),
    name,
    members: group.members.map((m) => m.toString()),
    depth: group.depth,
    zeroValue: group.zeroValue.toString()
  };
}

export function deserializeSemaphoreGroup(
  serializedGroup: SerializedSemaphoreGroup
) {
  const group = new Group(
    BigInt(serializedGroup.id),
    serializedGroup.depth,
    serializedGroup.members.map((m) => BigInt(m))
  );
  return group;
}
