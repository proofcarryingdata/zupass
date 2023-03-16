import { PCD, PCDPackage } from "@pcd/pcd-types";
import {
  MembershipProver,
  MembershipVerifier,
  PublicInput,
  Tree,
} from "@personaelabs/spartan-ecdsa";
var Buffer = require("buffer").Buffer;

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
  publicInput: PublicInput;
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
    publicInput: publicInput,
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
  const valid = await verifier.verify(
    pcd.proof.proof,
    pcd.claim.publicInput.serialize()
  );

  return valid;
}

export async function serialize(pcd: ETHPubkeyGroupPCD): Promise<string> {
  let preSerializedPCD = {
    publicInput: Buffer.from(pcd.claim.publicInput.serialize()).toString(
      "base64"
    ),
    circuitFilePath: pcd.claim.circuitFilePath,
    proof: Buffer.from(pcd.proof.proof).toString("base64"),
  };

  return JSON.stringify(preSerializedPCD);
}

export async function deserialize(
  serialized: string
): Promise<ETHPubkeyGroupPCD> {
  let postSerializedPCD = JSON.parse(serialized);

  let claim: ETHPubkeyGroupPCDClaim = {
    publicInput: PublicInput.deserialize(
      new Uint8Array(Buffer.from(postSerializedPCD.publicInput, "base64"))
    ),
    circuitFilePath: postSerializedPCD.circuitFilePath,
  };
  let proof: ETHPubkeyGroupPCDProof = {
    proof: new Uint8Array(Buffer.from(postSerializedPCD.proof, "base64")),
  };

  return new ETHPubkeyGroupPCD(claim, proof);
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
