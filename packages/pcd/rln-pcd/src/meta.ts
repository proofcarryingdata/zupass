import {
  BigIntArgument,
  ObjectArgument,
  PCDArgument,
  StringArgument
} from "@pcd/pcd-types";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

export const RLNPCDTypeName = "rln-pcd";

// Ref: https://github.com/Rate-Limiting-Nullifier/rlnjs/blob/97fe15e04428c6adf81dbc856859e07527a063c9/src/types.ts#L59-L66
export type RLNPCDArgs = {
  // Identifier of the app. Every app using RLN should use a unique identifier.
  rlnIdentifier: BigIntArgument;
  // The semaphore keypair for a user
  identity: PCDArgument<SemaphoreIdentityPCD>;
  // The semaphore group
  group: ObjectArgument<SerializedSemaphoreGroup>;
  // The message that the user is sending
  signal: StringArgument;
  // The timestamp the message is sent
  epoch: BigIntArgument;
};
