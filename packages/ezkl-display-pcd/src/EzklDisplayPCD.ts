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

import { EzklSecretPCD, EzklSecretPCDPackage } from "@pcd/ezkl-secret-pcd";

// import { prove as ezklProve, verify as ezklVerify } from "@ezkljs/engine";

import { v4 as uuid } from "uuid";

function stringToFloat(str: string) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString();
  }
  return parseFloat(result);
}

function unit8ArrayToJsonObect(uint8Array: Uint8Array) {
  // let string = new TextDecoder("utf-8").decode(uint8Array);
  let string = new TextDecoder().decode(uint8Array);
  let jsonObject = JSON.parse(string);
  return jsonObject;
}

async function getInit() {
  try {
    const module = await import("@ezkljs/engine/web/ezkl");
    const init = module.default;
    return init;
  } catch (err) {
    console.error("Failed to import module:", err);
  }
}

async function getProve() {
  try {
    const module = await import("@ezkljs/engine/web/ezkl");
    const init = module.prove;
    return init;
  } catch (err) {
    console.error("Failed to import module:", err);
  }
}

async function getGenWitness() {
  try {
    const module = await import("@ezkljs/engine/web/ezkl");
    const genWitness = module.genWitness;
    return genWitness;
  } catch (err) {
    console.error("Failed to import module:", err);
  }
}

async function getFloatToVecU64() {
  try {
    const module = await import("@ezkljs/engine/web/ezkl");
    const floatToVecU64 = module.floatToVecU64;
    return floatToVecU64;
  } catch (err) {
    console.error("Failed to import module:", err);
  }
}

async function getPoseidonHash() {
  try {
    const module = await import("@ezkljs/engine/web/ezkl");
    const poseidonHash = module.poseidonHash;
    return poseidonHash;
  } catch (err) {
    console.error("Failed to import module:", err);
  }
}

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
  // pk: Uint8ClampedArray;
  // model: Uint8ClampedArray;
  // settings: Uint8ClampedArray;
  // witness: Uint8ClampedArray;
  // pk: Uint8ClampedArray;
  // model: Uint8ClampedArray;
  // settings: Uint8ClampedArray;
  // srs: Uint8ClampedArray;
  secretPCD: EzklSecretPCD;
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
  if (!args.secretPCD.value) {
    throw new Error("Cannot make group proof: missing secret pcd");
  }
  return new EzklDisplayPCD(
    uuid(),
    { groupName: "GROUP1" },
    {
      secretPCD: await EzklSecretPCDPackage.deserialize(
        args.secretPCD.value.pcd
      )
    }
  );
}

// NOTE: look at semaphore camera code
// camera calls into this verify function
export async function verify(pcd: EzklDisplayPCD): Promise<boolean> {
  // get proof from cameria as deserialized proof (hex)
  // const proof = pcd.proof.hex;

  // // call verify
  // const verified = await EzklGroupPCDPackage.verify({
  //   groupName: "GROUP1",
  //   proof: { hex: proof }
  // });

  // return verified;
  return true;
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

export function getDisplayOptions(pcd: EzklDisplayPCD): DisplayOptions {
  return {
    header: "Ezkl Display PCD",
    // displayName: "ezkl-secret-" + pcd.id.substring(0, 4)
    displayName: "ezkl-display-" + pcd.id.substring(0, 4)
  };
}

export const EzklDisplayPCDPackage: PCDPackage = {
  name: EzklDisplayPCDTypeName,
  renderCardBody: EzklDisplayCardBody,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
