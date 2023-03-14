import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import {
  FullProof,
  generateProof,
  verifyProof,
} from "@semaphore-protocol/proof";
import JSONBig from "json-bigint";
import { PCD, PCDPackage } from "pcd-types";
import {
  SerializedSemaphoreGroup,
  serializeSemaphoreGroup,
} from "./SerializedSemaphoreGroup";

export interface SemaphoreGroupPCDArgs {
  group: Group;
  identity: Identity;
  externalNullifier: bigint;
  signal: bigint;
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;
}

export interface SemaphoreGroupPCDClaim {
  group: SerializedSemaphoreGroup;

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
      zkeyFilePath: args.zkeyFilePath,
      wasmFilePath: args.wasmFilePath,
    }
  );

  const claim: SemaphoreGroupPCDClaim = {
    group: serializeSemaphoreGroup(args.group, "name"),
    externalNullifier: args.externalNullifier.toString(),
    nullifierHash: fullProof.nullifierHash.toString(),
    signal: args.signal.toString(),
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

export async function serialize(pcd: SemaphoreGroupPCD): Promise<string> {
  return JSONBig().stringify(pcd);
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreGroupPCD> {
  return JSONBig().parse(serialized);
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphoreGroupPCDPackage: PCDPackage<
  SemaphoreGroupPCDClaim,
  SemaphoreGroupPCDProof,
  SemaphoreGroupPCDArgs
> = {
  name: "semaphore-group-signal",
  prove,
  verify,
  serialize,
  deserialize,
};
