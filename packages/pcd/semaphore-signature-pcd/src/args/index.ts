import { PCDArgument, StringArgument } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

export const SemaphoreSignaturePCDTypeName = "semaphore-signature-pcd";

// We hardcode the externalNullifer to also be your identityCommitment
// so that your nullifier for specific groups is not revealed when
// a SemaphoreSignaturePCD is requested from a consumer application.
export type SemaphoreSignaturePCDArgs = {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  signedMessage: StringArgument;
};
