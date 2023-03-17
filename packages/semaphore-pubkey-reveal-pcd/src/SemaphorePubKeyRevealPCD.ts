import { PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import {
  FullProof,
  generateProof,
  verifyProof,
} from "@semaphore-protocol/proof";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";

export const SemaphorePubKeyRevealPCDTypeName = "semaphore-pubkey-reveal-pcd";

export interface SemaphorePubKeyRevealPCDInitArgs {
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;
}

let initArgs: SemaphorePubKeyRevealPCDInitArgs | undefined = undefined;

export interface SemaphorePubKeyRevealPCDArgs {
  identity: Identity;
  externalNullifier: bigint;
  signal: bigint;
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
  id: string;

  public constructor(
    id: string,
    claim: SemaphorePubKeyRevealPCDClaim,
    proof: SemaphorePubKeyRevealPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function init(
  args: SemaphorePubKeyRevealPCDInitArgs
): Promise<void> {
  initArgs = args;
}

export async function prove(
  args: SemaphorePubKeyRevealPCDArgs
): Promise<SemaphorePubKeyRevealPCD> {
  if (!initArgs) {
    throw new Error(
      "cannot make pubkey reveal proof: init has not been called yet"
    );
  }

  // TODO: check the other parameters

  const group = new Group(1, 16);
  group.addMember(args.identity.commitment);

  const fullProof = await generateProof(
    args.identity,
    group,
    args.externalNullifier,
    args.signal,
    {
      zkeyFilePath: initArgs.zkeyFilePath,
      wasmFilePath: initArgs.wasmFilePath,
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

  return new SemaphorePubKeyRevealPCD(uuid(), claim, proof);
}

export async function verify(pcd: SemaphorePubKeyRevealPCD): Promise<boolean> {
  // check if proof is valid
  const validProof = await verifyProof(pcd.proof.proof, pcd.claim.groupDepth);

  // make sure proof is over a group with only your identity commitment
  const group = new Group(1, pcd.claim.groupDepth);
  group.addMember(pcd.claim.identityCommitment);
  const validSingletonGroup =
    group.root.toString() === pcd.proof.proof.merkleTreeRoot;

  return validProof && validSingletonGroup;
}

export async function serialize(
  pcd: SemaphorePubKeyRevealPCD
): Promise<SerializedPCD<SemaphorePubKeyRevealPCD>> {
  return {
    type: SemaphorePubKeyRevealPCDTypeName,
    pcd: JSONBig().stringify(pcd),
  } as SerializedPCD<SemaphorePubKeyRevealPCD>;
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
  SemaphorePubKeyRevealPCDArgs,
  SemaphorePubKeyRevealPCDInitArgs
> = {
  name: "semaphore-group-signal",
  init,
  prove,
  verify,
  serialize,
  deserialize,
};
