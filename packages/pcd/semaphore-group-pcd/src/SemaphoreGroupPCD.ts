import {
  BigIntArgument,
  ObjectArgument,
  PCD,
  PCDArgument
} from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { PackedProof } from "@pcd/semaphore-protocol-proof";
import { SerializedSemaphoreGroup } from "./SerializedSemaphoreGroup";

export const SemaphoreGroupPCDTypeName = "semaphore-group-signal";

export interface SempahoreGroupPCDInitArgs {
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;
}

export type SemaphoreGroupPCDArgs = {
  group: ObjectArgument<SerializedSemaphoreGroup>;
  identity: PCDArgument<SemaphoreIdentityPCD>;
  externalNullifier: BigIntArgument;
  signal: BigIntArgument;
};

export interface SemaphoreGroupPCDClaim {
  /**
   * The merkle root of the group being proven membership in. Retreiving members
   * in the root is left to the application logic.
   */
  merkleRoot: string;

  /**
   * Depth of the tree for the Merkle root.
   */
  depth: number;

  /**
   * Stringified `BigInt`.
   */
  signal: string;

  /**
   * Stringified `BigInt`.
   */
  externalNullifier: string;

  /**
   * Stringified `BigInt`.
   */
  nullifierHash: string;
}

export type SemaphoreGroupPCDProof = PackedProof;

export class SemaphoreGroupPCD
  implements PCD<SemaphoreGroupPCDClaim, SemaphoreGroupPCDProof>
{
  type = SemaphoreGroupPCDTypeName;
  claim: SemaphoreGroupPCDClaim;
  proof: SemaphoreGroupPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: SemaphoreGroupPCDClaim,
    proof: SemaphoreGroupPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
