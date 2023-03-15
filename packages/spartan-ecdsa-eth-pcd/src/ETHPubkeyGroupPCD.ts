import { PCD, PCDPackage } from "@pcd/pcd-types";

import { Tree } from "@personaelabs/spartan-ecdsa";

export interface ETHPubkeyGroupPCDArgs {
  tree: Tree;
  proverPubKey: Buffer;
}

export interface ETHPubkeyGroupPCDClaim {}

export interface ETHPubkeyGroupPCDProof {}

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
  throw new Error("Not implemented");
}

export async function verify(pcd: ETHPubkeyGroupPCD): Promise<boolean> {
  throw new Error("Not implemented");
}

export async function serialize(pcd: ETHPubkeyGroupPCD): Promise<string> {
  throw new Error("Not implemented");
}

export async function deserialize(
  serialized: string
): Promise<ETHPubkeyGroupPCD> {
  throw new Error("Not implemented");
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
