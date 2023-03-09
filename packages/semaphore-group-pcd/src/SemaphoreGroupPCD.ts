import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import {
  FullProof,
  generateProof,
  verifyProof,
} from "@semaphore-protocol/proof";
import { PCD, PCDPackage } from "pcd-types";
import { SemaphoreGroup, serializeSemaphoreGroup } from "semaphore-types";

export interface SemaphoreGroupPCDArgs {
  group: Group;
  identity: Identity;
  externalNullifier: bigint;
  signal: bigint;
}

export interface SemaphoreGroupPCDClaim {
  group: SemaphoreGroup;
  /**
   * Stringified `BigInt`.
   */
  identityCommitment: string;
}

export interface SemaphoreGroupPCDProof {
  proof: FullProof;
}

export class SemaphoreGroupPCD
  implements PCD<SemaphoreGroupPCDClaim, SemaphoreGroupPCDProof>
{
  type = "SemaphoreGroupPCD";
  claim: SemaphoreGroupPCDClaim;
  proof: SemaphoreGroupPCDProof;

  public constructor(
    claim: SemaphoreGroupPCDClaim,
    proof: SemaphoreGroupPCDProof
  ) {
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(
  args: SemaphoreGroupPCDArgs
): Promise<SemaphoreGroupPCD> {
  const fullProof = await generateProof(
    args.identity,
    args.group,
    args.externalNullifier,
    args.signal,
    {
      zkeyFilePath: "./semaphore-artifacts/16.zkey",
      wasmFilePath: "./semaphore-artifacts/16.wasm",
    }
  );

  const claim: SemaphoreGroupPCDClaim = {
    group: serializeSemaphoreGroup(args.group, "name"),
    identityCommitment: args.identity.commitment.toString(),
  };

  const proof: SemaphoreGroupPCDProof = {
    proof: fullProof,
  };

  return new SemaphoreGroupPCD(claim, proof);
}

export async function verify(pcd: SemaphoreGroupPCD): Promise<boolean> {
  const valid = await verifyProof(pcd.proof.proof, pcd.claim.group.depth);

  return valid;
}

export const SemaphoreGroupPCDPackage: PCDPackage<
  SemaphoreGroupPCDClaim,
  SemaphoreGroupPCDProof,
  SemaphoreGroupPCDArgs
> = {
  prove,
  verify,
};
