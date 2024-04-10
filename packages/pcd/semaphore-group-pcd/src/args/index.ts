import { BigIntArgument, ObjectArgument, PCDArgument } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { SerializedSemaphoreGroup } from "../SerializedSemaphoreGroup";

export const SemaphoreGroupPCDTypeName = "semaphore-group-signal";

export type SemaphoreGroupPCDArgs = {
  group: ObjectArgument<SerializedSemaphoreGroup>;
  identity: PCDArgument<SemaphoreIdentityPCD>;
  externalNullifier: BigIntArgument;
  signal: BigIntArgument;
};
