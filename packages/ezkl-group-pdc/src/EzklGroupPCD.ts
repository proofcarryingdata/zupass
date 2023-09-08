import {
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";

import { EzklSecretPCD } from "@pcd/ezkl-secret-pcd";

async function getProve() {
  try {
    const module = await import("@ezkljs/engine/web/ezkl");
    const prove = module.prove;
    return prove;
  } catch (err) {
    console.error("Failed to import module:", err);
  }
}

async function getVerify() {
  try {
    const module = await import("@ezkljs/engine/web/ezkl");
    const verify = module.verify;
    return verify;
  } catch (err) {
    console.error("Failed to import module:", err);
  }
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

async function getGenWitness() {
  try {
    const module = await import("@ezkljs/engine/web/ezkl");
    const genWitness = module.genWitness;
    return genWitness;
  } catch (err) {
    console.error("Failed to import module:", err);
  }
}

export const EzklGroupPCDTypeName = "ezkl-group-pcd";

export interface EzklGroupPCDArgs {
  group: "GROUP1";
  witness: Uint8ClampedArray;
  pk: Uint8ClampedArray;
  model: Uint8ClampedArray;
  settings: Uint8ClampedArray;
  srs: Uint8ClampedArray;
}

export interface EzklGroupPCDClaim {
  // identity: Uint8ClampedArray;
  // hash: Uint8ClampedArray;
  groupName: "GROUP1";
}

export interface EzklGroupPCDProof {
  // proof: Uint8Array;
  hex: Uint8Array;
}

export class EzklGroupPCD implements PCD<EzklGroupPCDClaim, EzklGroupPCDProof> {
  type = EzklGroupPCDTypeName;
  claim: EzklGroupPCDClaim;
  proof: EzklGroupPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: EzklGroupPCDClaim,
    proof: EzklGroupPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(args: EzklGroupPCDArgs): Promise<EzklGroupPCD> {
  console.log("==============================");
  console.log("==============================");
  console.log("==============================");
  console.log("==============================");
  console.log("==============================");
  console.log("==============================");
  console.log("==============================");
  // const

  // we need the secret from the secret pcd
  // const secretPCD = await deserializeSemaphoreGroup(args.secretPCD);
  // input is serialized secret pcd
  // const input = "sereialized secret pcd" as unknown as Uint8ClampedArray;

  // // we need the pk
  // // comes from display PCD
  // const model = "model.ezkl" as unknown as Uint8ClampedArray;
  // const settings = "settings.json" as unknown as Uint8ClampedArray;
  // const srs = "kzg.srs" as unknown as Uint8ClampedArray;

  const { model, pk, settings, srs, witness } = args;

  const init = await getInit();
  if (!init) {
    throw new Error("Failed to import module");
  }

  await init(
    // undefined,
    "http://localhost:3000/ezkl-artifacts/ezkl_bg.wasm",
    new WebAssembly.Memory({ initial: 20, maximum: 1024, shared: true })
  );

  // const genWitness = await getGenWitness();
  // if (!genWitness) {
  //   throw new Error("Failed to import module");
  // }

  const ezklProve = await getProve();
  if (!ezklProve) {
    throw new Error("Failed to import module");
  }

  // call genWitness
  // const witness = new Uint8ClampedArray(genWitness(model, input, settings));

  const proof = await ezklProve(witness, pk, model, settings, srs);

  return new EzklGroupPCD(uuid(), { groupName: "GROUP1" }, { hex: proof });
}

export async function verify(pcd: EzklGroupPCD): Promise<boolean> {
  const ezklVerify = await getVerify();
  if (!ezklVerify) {
    throw new Error("Failed to import module");
  }

  const vk = "vk.key" as unknown as Uint8ClampedArray;
  const settings = "settings.json" as unknown as Uint8ClampedArray;
  const srs = "kzg.srs" as unknown as Uint8ClampedArray;
  const verified = await ezklVerify(
    new Uint8ClampedArray(pcd.proof.hex),
    vk,
    settings,
    srs
  );

  return verified;
}

export async function serialize(
  pcd: EzklSecretPCD
): Promise<SerializedPCD<EzklSecretPCD>> {
  return {
    type: EzklGroupPCDTypeName,
    pcd: JSONBig().stringify(pcd)
  } as SerializedPCD<EzklSecretPCD>;
}

export async function deserialize(serialized: string): Promise<EzklSecretPCD> {
  return JSONBig().parse(serialized);
}

export const EzklGroupPCDPackage: PCDPackage = {
  name: EzklGroupPCDTypeName,
  prove,
  verify,
  serialize,
  deserialize
};
