import { EdDSAFrogPCD, IFrogData } from "@pcd/eddsa-frog-pcd";
import type { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import { BigIntArgument, PCD, PCDArgument } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { Groth16Proof } from "@pcd/snarkjs";

/**
 * The global unique type name of the {@link ZKEdDSAFrogPCD}.
 */
export const ZKEdDSAFrogPCDTypeName = "zk-eddsa-frog-pcd";

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 * These are the artifacts associated with the circom circuit.
 */
export interface ZKEdDSAFrogPCDInitArgs {
  zkeyFilePath: string;
  wasmFilePath: string;
}

/**
 * Defines the essential paratmeters required for creating an {@link ZKEdDSAFrogPCD}.
 */
export type ZKEdDSAFrogPCDArgs = {
  frog: PCDArgument<EdDSAFrogPCD>;

  identity: PCDArgument<SemaphoreIdentityPCD>;

  externalNullifier: BigIntArgument;

  watermark: BigIntArgument;
};

/**
 * Defines the ZKEdDSAEventTicketPCD claim.
 */
export interface ZKEdDSAFrogPCDClaim {
  partialFrog: Partial<IFrogData>;
  signerPublicKey: EdDSAPublicKey;
  /**
   * Stringified `BigInt`.
   */
  externalNullifier: string;
  /**
   * Stringified `BigInt`.
   */
  nullifierHash: string;
  watermark: string;
}

/**
 * The ZK EdDSA Frog PCD enables the verification that an owner with a Semaphore
 * identity owns the EdDSA Frog PCD while keeping the owner's semaphore identity private.
 */
export class ZKEdDSAFrogPCD implements PCD<ZKEdDSAFrogPCDClaim, Groth16Proof> {
  type = ZKEdDSAFrogPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: ZKEdDSAFrogPCDClaim,
    readonly proof: Groth16Proof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
