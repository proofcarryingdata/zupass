import { PCD } from "@pcd/pcd-types";

export const InputTestPCDTypeName = "input-test-pcd";

export type InputTestPCDArgs = Record<string, never>;

export interface InputTestPCDClaim {}

export type InputTestPCDProof = undefined;

export class InputTestPCD implements PCD<InputTestPCDClaim, InputTestPCDProof> {
  type = InputTestPCDTypeName;
  claim: InputTestPCDClaim;
  proof: InputTestPCDProof;
  id: string;

  public constructor(id: string, claim: InputTestPCDClaim) {
    this.claim = claim;
    this.proof = undefined;
    this.id = id;
  }
}
