import { PCD, PCDPackage } from "@pcd/pcd-types";
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import {
  FullProof,
  generateProof,
  verifyProof,
} from "@semaphore-protocol/proof";
import JSONBig from "json-bigint";

export interface SemaphorePubKeyRevealPCDArgs {
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

export interface SemaphorePubKeyRevealPCDClaim {
  groupDepth: number;

  /**
   * Stringified `BigInt`.
   */
  identityCommitment: string;

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

export interface SemaphorePubKeyRevealPCDProof {
  proof: FullProof;
}

export class SemaphorePubKeyRevealPCD
  implements PCD<SemaphorePubKeyRevealPCDClaim, SemaphorePubKeyRevealPCDProof>
{
  type = "SemaphorePubKeyRevealPCD";
  claim: SemaphorePubKeyRevealPCDClaim;
  proof: SemaphorePubKeyRevealPCDProof;

  public constructor(
    claim: SemaphorePubKeyRevealPCDClaim,
    proof: SemaphorePubKeyRevealPCDProof
  ) {
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(
  args: SemaphorePubKeyRevealPCDArgs
): Promise<SemaphorePubKeyRevealPCD> {
  const group = new Group(1, 16);
  group.addMember(args.identity.commitment);

  const fullProof = await generateProof(
    args.identity,
    group,
    args.externalNullifier,
    args.signal,
    {
      zkeyFilePath: args.zkeyFilePath,
      wasmFilePath: args.wasmFilePath,
    }
  );

  const claim: SemaphorePubKeyRevealPCDClaim = {
    groupDepth: group.depth,
    identityCommitment: args.identity.commitment.toString(),
    externalNullifier: args.externalNullifier.toString(),
    nullifierHash: fullProof.nullifierHash.toString(),
    signal: args.signal.toString(),
  };

  const proof: SemaphorePubKeyRevealPCDProof = {
    proof: fullProof,
  };

  return new SemaphorePubKeyRevealPCD(claim, proof);
}

export async function verify(pcd: SemaphorePubKeyRevealPCD): Promise<boolean> {
  const valid = await verifyProof(pcd.proof.proof, pcd.claim.groupDepth);

  return valid;
}

export async function serialize(
  pcd: SemaphorePubKeyRevealPCD
): Promise<string> {
  return JSONBig().stringify(pcd);
}

export async function deserialize(
  serialized: string
): Promise<SemaphorePubKeyRevealPCD> {
  return JSONBig().parse(serialized);
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphorePubKeyRevealPCDPackage: PCDPackage<
  SemaphorePubKeyRevealPCDClaim,
  SemaphorePubKeyRevealPCDProof,
  SemaphorePubKeyRevealPCDArgs
> = {
  name: "semaphore-group-signal",
  prove,
  verify,
  serialize,
  deserialize,
};
