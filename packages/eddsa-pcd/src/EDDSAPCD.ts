import {
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  BigIntSequenceArgument,
  StringArgument
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import circomlib from "circomlibjs";
import { v4 as uuid } from "uuid";
//import { RSACardBody } from "./CardBody";

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="util/declarations/circomlibjs.d.ts" />

export const EdDSAPCDTypeName = "eddsa-pcd";

export interface EdDSAPCDArgs {
  privateKey: StringArgument;
  signedMessage: BigIntSequenceArgument;
  id: StringArgument;
}

export interface EdDSAPCDClaim {
  message: bigint[];
}

export interface EdDSAPCDProof {
  publicKey: string;
  signature: string;
}

export class EdDSAPCD implements PCD<EdDSAPCDClaim, EdDSAPCDProof> {
  type = EdDSAPCDTypeName;
  claim: EdDSAPCDClaim;
  proof: EdDSAPCDProof;
  id: string;

  public constructor(id: string, claim: EdDSAPCDClaim, proof: EdDSAPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(args: EdDSAPCDArgs): Promise<EdDSAPCD> {}

export async function verify(pcd: EdDSAPCD): Promise<boolean> {}
