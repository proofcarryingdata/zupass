import { PCD, PCDPackage } from "@pcd/pcd-types";
import {
  MembershipProver,
  MembershipVerifier,
  Tree,
} from "@personaelabs/spartan-ecdsa";
import JSONBig from "json-bigint";

export interface ETHPubkeyGroupPCDArgs {
  tree: Tree;
  pubKeyPoseidonHash: bigint;
  msgHash: Buffer;
  sig: string;
  wasmFilePath: string;
  circuitFilePath: string;
}

// TODO: break this up into more parts to make claim
// more easily parseable
export interface ETHPubkeyGroupPCDClaim {
  publicInput: Uint8Array;
  circuitFilePath: string;
}

export interface ETHPubkeyGroupPCDProof {
  proof: Uint8Array;
}

export class ETHPubkeyGroupPCD
  implements PCD<ETHPubkeyGroupPCDClaim, ETHPubkeyGroupPCDProof>
{
  type = "ETHPubkeyGroupPCD";
  claim: ETHPubkeyGroupPCDClaim;
  proof: ETHPubkeyGroupPCDProof;

  public constructor(
    claim: ETHPubkeyGroupPCDClaim,
    proof: ETHPubkeyGroupPCDProof
  ) {
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(
  args: ETHPubkeyGroupPCDArgs
): Promise<ETHPubkeyGroupPCD> {
  // Compute the merkle proof
  const index = args.tree.indexOf(args.pubKeyPoseidonHash);
  const merkleProof = args.tree.createProof(index);

  // Init the prover
  const prover = new MembershipProver({
    witnessGenWasm: args.wasmFilePath,
    circuit: args.circuitFilePath,
  });
  await prover.initWasm();

  // Prove membership
  const { proof, publicInput } = await prover.prove(
    args.sig,
    args.msgHash,
    merkleProof
  );

  // Set up PCD
  const claimPCD: ETHPubkeyGroupPCDClaim = {
    publicInput: publicInput.serialize(),
    circuitFilePath: args.circuitFilePath,
  };
  const proofPCD: ETHPubkeyGroupPCDProof = {
    proof: proof,
  };

  return new ETHPubkeyGroupPCD(claimPCD, proofPCD);
}

export async function verify(pcd: ETHPubkeyGroupPCD): Promise<boolean> {
  // Init verifier
  const verifier = new MembershipVerifier({
    circuit: pcd.claim.circuitFilePath,
  });
  await verifier.initWasm();

  // Verify proof
  const valid = await verifier.verify(pcd.proof.proof, pcd.claim.publicInput);

  return valid;
}

export async function serialize(pcd: ETHPubkeyGroupPCD): Promise<string> {
  return JSONBig().stringify(pcd);
}

export async function deserialize(
  serialized: string
): Promise<ETHPubkeyGroupPCD> {
  return JSONBig().parse(serialized);
}

/**
 * PCD-conforming wrapper
 */
export const ETHPubkeyGroupPCDPackage: PCDPackage<
  ETHPubkeyGroupPCDClaim,
  ETHPubkeyGroupPCDProof,
  ETHPubkeyGroupPCDArgs
> = {
  name: "eth-pubkey-group-membership",
  prove,
  verify,
  serialize,
  deserialize,
};
