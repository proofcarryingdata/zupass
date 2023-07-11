import {
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument,
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import NodeRSA from "node-rsa";
import { v4 as uuid } from "uuid";
import { RSACardBody } from "./CardBody";

export const RSAPCDTypeName = "rsa-pcd";

export interface RSAPCDArgs {
  privateKey: StringArgument;
  signedMessage: StringArgument;
}

export interface RSAPCDClaim {
  /**
   * Message that was signed by the RSA private key corresponding to
   * {@link RSAPCDProof#publicKey}.
   */
  message: string;
}

export interface RSAPCDProof {
  /**
   * RSA public key corresponding to the private key which signed
   * {@link RSAPCDClaim#message}.
   */
  publicKey: string;

  /**
   * The signature of {@link RSAPCDClaim#message} with the RSA
   * private key corresponding to {@link RSAPCDProof#publicKey}
   */
  signature: string;
}

export class RSAPCD implements PCD<RSAPCDClaim, RSAPCDProof> {
  type = RSAPCDTypeName;
  claim: RSAPCDClaim;
  proof: RSAPCDProof;
  id: string;

  public constructor(id: string, claim: RSAPCDClaim, proof: RSAPCDProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(args: RSAPCDArgs): Promise<RSAPCD> {
  if (args.privateKey.value == null) {
    throw new Error("missing private key value");
  }

  if (args.signedMessage.value == null) {
    throw new Error("missing message to sign");
  }

  const key = new NodeRSA(args.privateKey.value);
  const publicKey = key.exportKey("public");
  const signature = key.sign(args.signedMessage.value, "hex");

  return new RSAPCD(
    uuid(),
    { message: args.signedMessage.value },
    { publicKey, signature }
  );
}

export async function verify(pcd: RSAPCD): Promise<boolean> {
  try {
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
    pcd: JSONBig().stringify(pcd),
  } as SerializedPCD<RSAPCD>;
}

export async function deserialize(serialized: string): Promise<RSAPCD> {
  return JSONBig().parse(serialized);
}

export function getDisplayOptions(pcd: RSAPCD): DisplayOptions {
  return {
    header: "RSA Signature",
    displayName: "rsa-sig-" + pcd.id.substring(0, 4),
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
  renderCardBody: RSACardBody,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize,
};
