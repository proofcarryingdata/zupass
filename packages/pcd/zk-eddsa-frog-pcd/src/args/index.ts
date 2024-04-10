import { EdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import { BigIntArgument, PCDArgument } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

/**
 * The global unique type name of the {@link ZKEdDSAFrogPCD}.
 */
export const ZKEdDSAFrogPCDTypeName = "zk-eddsa-frog-pcd";

/**
 * Defines the essential paratmeters required for creating an {@link ZKEdDSAFrogPCD}.
 */
export type ZKEdDSAFrogPCDArgs = {
  frog: PCDArgument<EdDSAFrogPCD>;

  identity: PCDArgument<SemaphoreIdentityPCD>;

  externalNullifier: BigIntArgument;

  watermark: BigIntArgument;
};
