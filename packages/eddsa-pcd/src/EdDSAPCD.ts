import {
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument,
  StringArrayArgument
} from "@pcd/pcd-types";
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./util/declarations/circomlibjs.d.ts" />
import { buildEddsa, buildPoseidon, Eddsa, PoseidonFn } from "circomlibjs";
import { v4 as uuid } from "uuid";
import { EdDSACardBody } from "./CardBody";

export const EdDSAPCDTypeName = "eddsa-pcd";

export interface EdDSAInitArgs {}

export interface EdDSAPCDArgs {
  // The 32-byte EdDSA private key to sign the message with, as a hex string.
  // Any 32 bytes work as a private key. Use {@link newEdDSAPrivateKey} to
  // generate a new one securely.
  privateKey: StringArgument;
  // The message is an array of bigints, represented here as an array of
  // strings
  message: StringArrayArgument;
  // A unique string identifying the PCD
  id: StringArgument;
}

// The claim is that we have a message that was signed by a public key
export interface EdDSAPCDClaim {
  // The public key is a pair of hex strings, representing a point on
  // the elliptic curve
  publicKey: [string, string];
  // The message is an array of bigints, each representing a field
  message: bigint[];
}

// The proof is the signature, in the form of a string representation of
// hex digits.
// This signature proves that the private key matching publicKey in
// the claim was used to sign the message.
export interface EdDSAPCDProof {
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

let eddsa: Eddsa;
let poseidon: PoseidonFn;

export async function init(): Promise<void> {
  eddsa = await buildEddsa();
  poseidon = await buildPoseidon();
}

const fromHexString = (hexString: string) => Buffer.from(hexString, "hex");

const toHexString = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

export async function prove(args: EdDSAPCDArgs): Promise<EdDSAPCD> {
  if (!args.privateKey.value) {
    throw new Error("No private key value provided");
  }

  if (!args.message.value) {
    throw new Error("No message value provided");
  }

  let message;
  try {
    message = args.message.value.map((fieldStr: string) => BigInt(fieldStr));
  } catch (e) {
    throw new Error("Could not convert message contents to bigint type");
  }

  const id = typeof args.id.value === "string" ? args.id.value : uuid();

  const prvKey = fromHexString(args.privateKey.value);

  const hashedMessage = poseidon(message);
  const publicKey: [string, string] = eddsa
    .prv2pub(prvKey)
    .map(toHexString) as [string, string];
  const signature = toHexString(
    eddsa.packSignature(eddsa.signPoseidon(prvKey, hashedMessage))
  );

  return new EdDSAPCD(id, { message, publicKey }, { signature });
}

export async function verify(pcd: EdDSAPCD): Promise<boolean> {
  const signature = eddsa.unpackSignature(fromHexString(pcd.proof.signature));
  const pubKey = pcd.claim.publicKey.map(fromHexString);
  const hashedMessage = poseidon(pcd.claim.message);

  return eddsa.verifyPoseidon(hashedMessage, signature, pubKey);
}

function replacer(key: any, value: any): any {
  if (key === "message") {
    return value.map((num: bigint) => num.toString(16));
  } else {
    return value;
  }
}

function reviver(key: any, value: any): any {
  if (key === "message") {
    return value.map((str: string) => BigInt(`0x${str}`));
  } else {
    return value;
  }
}

export async function serialize(
  pcd: EdDSAPCD
): Promise<SerializedPCD<EdDSAPCD>> {
  return {
    type: EdDSAPCDTypeName,
    pcd: JSON.stringify(pcd, replacer)
  };
}

export async function deserialize(serialized: string): Promise<EdDSAPCD> {
  return JSON.parse(serialized, reviver);
}

export function getDisplayOptions(pcd: EdDSAPCD): DisplayOptions {
  return {
    header: "EdDSA Signature",
    displayName: "eddsa-sig-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper to sign messages using an EdDSA key.
 */
export const EdDSAPCDPackage: PCDPackage<
  EdDSAPCDClaim,
  EdDSAPCDProof,
  EdDSAPCDArgs,
  EdDSAInitArgs
> = {
  name: EdDSAPCDTypeName,
  renderCardBody: EdDSACardBody,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize,
  init
};

export function getEdDSAPublicKey(privateKey: string): [string, string] {
  return eddsa.prv2pub(fromHexString(privateKey)).map(toHexString) as [
    string,
    string
  ];
}
