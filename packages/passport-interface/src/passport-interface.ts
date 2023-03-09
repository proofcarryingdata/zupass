import { Group } from "@semaphore-protocol/group";
import { PCD } from "pcd-types";

export interface PCDGetRequest {
  origin: string;
  type: string;
  parameters: any;
  // etc.
}

export interface PCDAddRequest {
  origin: string;
  pcd: PCD;
}

export function constructPassportPcdGetRequestUrl(
  passportOrigin: string,
  pcdType: string,
  parameters: any
) {
  return "";
}

export function receivePassportRequest(
  url: string
): PCDGetRequest | PCDAddRequest {
  return {} as any;
}

export function serializeSemaphoreGroup(
  group: Group,
  name: string
): SemaphoreGroup {
  return {
    id: group.id.toString(),
    name,
    members: group.members.map((m) => m.toString()),
    depth: group.depth,
  };
}

export function deserializeSemaphoreGroup(serializedGroup: SemaphoreGroup) {
  const group = new Group(BigInt(serializedGroup.id), serializedGroup.depth);
  group.addMembers(serializedGroup.members.map((m) => BigInt(m)));
  return group;
}

export interface SemaphoreGroup {
  id: string;
  name: string;
  members: string[];
  depth: number;
}
