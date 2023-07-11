import {
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument,
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
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

export async function prove(args: RSAPCDArgs): Promise<RSAPCD> {}

export async function verify(pcd: RSAPCD): Promise<boolean> {}

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
