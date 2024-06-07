import { ObjectArgument, PCD, StringArgument } from "@pcd/pcd-types";

/**
 * The globally unique type name of the {@link EdDSAPCD}.
 */
export const ObjPCDTypeName = "obj-pcd";

/**
 * Interface containing the arguments that 3rd parties use to
 * initialize this PCD package.
 * It is empty because this package does not implement the `init` function.
 */
export interface ObjInitArgs {}

export type ObjPCDArgs = {
  obj: ObjectArgument<unknown>;
  id: StringArgument;
};

export interface ObjPCDClaim {}

export interface ObjPCDProof {
  obj: unknown;
}

export class ObjPCD implements PCD<ObjPCDClaim, ObjPCDProof> {
  public type = ObjPCDTypeName;

  public id: string;
  public claim: ObjPCDClaim;
  public proof: ObjPCDProof;

  public constructor(id: string, claim: ObjPCDClaim, proof: ObjPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
