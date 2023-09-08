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
  console.log("ARGS", args);
  return new EzklDisplayPCD(
    uuid(),
    { groupName: "GROUP1" },
    {
      secretPCD: await EzklSecretPCDPackage.deserialize(
        args.secretPCD.value.pcd
      )
    }
  );
  console.log("DISPLAY", args);
  if (!args.secretPCD.value) {
    throw new Error("Cannot make group proof: missing secret pcd");
  }
  const secretPCD = await EzklSecretPCDPackage.deserialize(
    args.secretPCD.value.pcd
  );

  const genWitness = await getGenWitness();
  const init = await getInit();

  if (!init) {
    throw new Error("Failed to import module init");
  }
  await init(
    // undefined,
    "http://localhost:3000/ezkl-artifacts/ezkl_bg.wasm",
    new WebAssembly.Memory({ initial: 20, maximum: 1024, shared: true })
  );

  if (!genWitness) {
    throw new Error("Failed to import module genWitness");
  }

  // FETCH COMPILED MODEL
  const compiliedModelResp = await fetch("/ezkl-artifacts/network.compiled");
  if (!compiliedModelResp.ok) {
    throw new Error("Failed to fetch network.compiled");
  }
  const modelBuf = await compiliedModelResp.arrayBuffer();
  const model = new Uint8ClampedArray(modelBuf);

  // FETCH SETTINGS
  const settingsResp = await fetch("/ezkl-artifacts/settings.json");
  if (!settingsResp.ok) {
    throw new Error("Failed to fetch settings.json");
  }
  const settingsBuf = await settingsResp.arrayBuffer();
  const settings = new Uint8ClampedArray(settingsBuf);

  console.log("AFTER LOAD FILES");

  const { clearSecret } = secretPCD.proof;
  console.log("clearSecret", clearSecret);
  const float = stringToFloat(clearSecret);
  console.log("float", float);
  console.log("typeof float", typeof float);

  const floatToVecU64 = await getFloatToVecU64();
  if (!floatToVecU64) {
    throw new Error("Float to vec u64 not found");
  }
  const u64Ser = floatToVecU64(float, 0);
  console.log("successfully called floatToVecU64");
  const u64Output = unit8ArrayToJsonObect(new Uint8Array(u64Ser.buffer));
  const u64Array = [u64Output];

  const string = JSONBig.stringify(u64Array);
  const buffer = new TextEncoder().encode(string);
  const u64sOutputSer = new Uint8ClampedArray(buffer.buffer);

  const poseidonHash = await getPoseidonHash();
  if (!poseidonHash) {
    throw new Error("Poseidon hash not found");
  }
  console.log("u64sOutputSer", u64sOutputSer);
  const hash = await poseidonHash(u64sOutputSer);
  const hashString = new TextDecoder().decode(hash);
  const jsonHash = JSONBig.parse(hashString);
  const inputObj = {
    input_data: jsonHash,
    output_data: [[]]
  };
  console.log("hash", jsonHash);
  const jsonWitness = JSONBig.stringify(inputObj);
  const encodedWitness = new TextEncoder().encode(jsonWitness);
  const witnessInput = new Uint8ClampedArray(encodedWitness.buffer);
  console.log("witnessInput", witnessInput);

  const witness = new Uint8ClampedArray(
    genWitness(model, witnessInput, settings)
  );
  console.log("witness", witness);

  // FETCH PK
  const pkResp = await fetch("/ezkl-artifacts/test.pk");
  if (!pkResp.ok) {
    throw new Error("Failed to fetch pk.key");
  }
  const pkBuf = await pkResp.arrayBuffer();
  const pk = new Uint8ClampedArray(pkBuf);

  // FETCH SRS
  const srsResp = await fetch("/ezkl-artifacts/kzg.srs");
  if (!srsResp.ok) {
    throw new Error("Failed to fetch kzg.srs");
  }
  const srsBuf = await srsResp.arrayBuffer();
  const srs = new Uint8ClampedArray(srsBuf);

  // call prove on the EzklGroupPCD
  // pass in the fetched Pk

  // const ezklProve = await getProve();
  // if (!ezklProve) {
  //   throw new Error("Failed to import module ezklProve");
  // }

  // const proof = await ezklProve(witness, pk, model, settings, srs);
  // console.log("proof", proof);

  console.log("ABOUT TO RETURN");

  const pcd = new EzklDisplayPCD(
    uuid(),
    { groupName: "GROUP1" },
    {
      witness,
      pk,
      model,
      settings,
      srs
    }
  );

  const serialized = await EzklDisplayPCDPackage.serialize(pcd);
  console.log("serialized", serialized);

  console.log("pcd", pcd);
  return pcd;
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

export const EzklDisplayPCDPackage: PCDPackage = {
  name: EzklDisplayPCDTypeName,
  renderCardBody: EzklDisplayCardBody,
  prove,
  verify,
  serialize,
  deserialize
};
