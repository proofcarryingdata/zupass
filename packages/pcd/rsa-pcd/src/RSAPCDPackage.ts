import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { requireDefinedParameter } from "@pcd/util";
import { Buffer } from "buffer";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  RSAPCD,
  RSAPCDArgs,
  RSAPCDClaim,
  RSAPCDProof,
  RSAPCDTypeName
} from "./RSAPCD";

export async function prove(args: RSAPCDArgs): Promise<RSAPCD> {
  if (args.privateKey.value === undefined || args.privateKey.value === "") {
    throw new Error("missing private key value");
  }

  if (args.signedMessage.value === undefined) {
    throw new Error("missing message to sign");
  }

  const id = typeof args.id.value === "string" ? args.id.value : uuid();
  const { default: NodeRSA } = await import("node-rsa");
  const key = new NodeRSA(args.privateKey.value);
  const publicKey = key.exportKey("public");
  const signature = key.sign(args.signedMessage.value, "hex");

  return new RSAPCD(
    id,
    { message: args.signedMessage.value },
    { publicKey, signature }
  );
}

export async function verify(pcd: RSAPCD): Promise<boolean> {
  try {
    const { default: NodeRSA } = await import("node-rsa");
    const publicKey = new NodeRSA(pcd.proof.publicKey, "public");
    const valid = publicKey.verify(
      Buffer.from(pcd.claim.message),
      pcd.proof.signature,
      "utf8",
      "hex"
    );
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(pcd: RSAPCD): Promise<SerializedPCD<RSAPCD>> {
  return {
    type: RSAPCDTypeName,
    pcd: JSONBig().stringify(pcd)
  } as SerializedPCD<RSAPCD>;
}

export async function deserialize(serialized: string): Promise<RSAPCD> {
  const { id, claim, proof } = JSONBig().parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new RSAPCD(id, claim, proof);
}

export function getDisplayOptions(pcd: RSAPCD): DisplayOptions {
  return {
    header: "RSA Signature",
    displayName: "rsa-sig-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper to sign messages using an RSA keypair.
 */
export const RSAPCDPackage: PCDPackage<
  RSAPCDClaim,
  RSAPCDProof,
  RSAPCDArgs,
  undefined
> = {
  name: RSAPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
