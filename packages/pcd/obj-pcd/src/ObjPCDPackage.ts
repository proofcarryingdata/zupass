import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { requireDefinedParameter } from "@pcd/util";
import { v4 as uuid } from "uuid";
import {
  ObjInitArgs,
  ObjPCD,
  ObjPCDArgs,
  ObjPCDClaim,
  ObjPCDProof,
  ObjPCDTypeName
} from "./ObjPCD.js";

export async function prove(args: ObjPCDArgs): Promise<ObjPCD> {
  const id = typeof args.id.value === "string" ? args.id.value : uuid();
  return new ObjPCD(id, {}, { obj: args.obj.value });
}

export async function verify(_pcd: ObjPCD): Promise<boolean> {
  return true;
}

export async function serialize(pcd: ObjPCD): Promise<SerializedPCD<ObjPCD>> {
  return {
    type: ObjPCDTypeName,
    pcd: JSON.stringify(pcd)
  };
}

export async function deserialize(serialized: string): Promise<ObjPCD> {
  const { id, claim, proof } = JSON.parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new ObjPCD(id, claim, proof);
}

export function getDisplayOptions(pcd: ObjPCD): DisplayOptions {
  return {
    header: "EdDSA Signature",
    displayName: "eddsa-sig-" + pcd.id.substring(0, 4)
  };
}

export const ObjPCDPackage: PCDPackage<
  ObjPCDClaim,
  ObjPCDProof,
  ObjPCDArgs,
  ObjInitArgs
> = {
  name: ObjPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
