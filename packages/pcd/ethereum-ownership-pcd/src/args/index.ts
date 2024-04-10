import { PCDArgument, StringArgument } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

export const EthereumOwnershipPCDTypeName = "ethereum-ownership-pcd";

export type EthereumOwnershipPCDArgs = {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  ethereumAddress: StringArgument;
  ethereumSignatureOfCommitment: StringArgument;
};
