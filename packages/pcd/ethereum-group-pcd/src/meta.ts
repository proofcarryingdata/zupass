import { PCDArgument, StringArgument } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

export const EthereumGroupPCDTypeName = "ethereum-group-pcd";

export type EthereumGroupPCDArgs = {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  signatureOfIdentityCommitment: StringArgument;
  merkleProof: StringArgument;
  groupType: StringArgument;
};
