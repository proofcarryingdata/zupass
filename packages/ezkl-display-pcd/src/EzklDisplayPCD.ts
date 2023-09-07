import {
  BigIntArgument,
  DisplayOptions,
  ObjectArgument,
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import { EzklDisplayCardBody } from "./CardBody";

import { EzklGroupPCD, EzklGroupPCDPackage } from "@pcd/ezkl-group-pcd";

import { EzklSecretPCD } from "@pcd/ezkl-secret-pcd";

// import { prove as ezklProve, verify as ezklVerify } from "@ezkljs/engine";

import { v4 as uuid } from "uuid";

export const EzklDisplayPCDTypeName = "ezkl-display-pcd";

export interface EzklDisplayPCDInitArgs {
  makeEncodedVerifyLink?: (encodedPCD: string) => string;
}

export let initArgs: EzklDisplayPCDInitArgs;

export interface EzklDisplayPCDArgs {
  // hash: Uint8ClampedArray;
  secretPCD: PCDArgument<EzklSecretPCD>;
  // value empty at instqanitation
  // value populated with scerectPCD by PCDPAss
  // now we have access to args.secretPCD.value.claim.hash
}

export interface EzklDisplayPCDClaim {
  // hash: Uint8ClampedArray;
  groupName: "GROUP1";
}


// stuff i need to call prove on EzklGroupPCD
export interface EzklDisplayPCDProof {
  pk: Uint8ClampedArray;
  model: Uint8ClampedArray;
  settings: Uint8ClampedArray;
}

export class EzklDisplayPCD
  implements PCD<EzklDisplayPCDClaim, EzklDisplayPCDProof>
{
  type = EzklDisplayPCDTypeName;
  claim: EzklDisplayPCDClaim;
  proof: EzklDisplayPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: EzklDisplayPCDClaim,
    proof: EzklDisplayPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

//userProvided: true
export async function prove(args: EzklDisplayPCDArgs): Promise<EzklDisplayPCD> {
  const url = "https://hub.ezkl.org/pcd/get-pk";
  const response = await fetch(url, {
    method: "GET"
  });
  const data = await response.json();
  const pk = data.pk;

  // call prove on the EzklGroupPCD
  // pass in the fetched Pk
  const groupPCD = await EzklGroupPCDPackage.prove({
    name: "GROUP1",
    pk
  });

  return new EzklDisplayPCD(
    uuid(),
    { groupName: "GROUP1" },
    { hex: groupPCD.proof.hex }
  );
}

// NOTE: look at semaphore camera code
// camera calls into this verify function
export async function verify(pcd: EzklDisplayPCD): Promise<boolean> {
  // get proof from cameria as deserialized proof (hex)
  const proof = pcd.proof.hex;

  // call verify
  const verified = await EzklGroupPCDPackage.verify({
    groupName: "GROUP1",
    proof: { hex: proof }
  });

  return verified;
}

export async function serialize(
  pcd: EzklDisplayPCD
): Promise<SerializedPCD<EzklDisplayPCD>> {
  return {
    type: EzklDisplayPCDTypeName,
    pcd: JSONBig().stringify(pcd)
  } as SerializedPCD<EzklSecretPCD>;
}

export async function deserialize(serialized: string): Promise<EzklDisplayPCD> {
  return JSONBig().parse(serialized);
}

export const EzklDisplayPCDPackage: PCDPackage = {
  name: EzklDisplayPCDTypeName,
  renderCardBody: EzklDisplayCardBody,
  prove,
  verify,
  serialize,
  deserialize
};