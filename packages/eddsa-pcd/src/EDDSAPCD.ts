import { PCD, StringArgument, StringArrayArgument } from "@pcd/pcd-types";
import { buildEddsa, buildPoseidon } from "circomlibjs";
import { v4 as uuid } from "uuid";

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="util/declarations/circomlibjs.d.ts" />

export const EdDSAPCDTypeName = "eddsa-pcd";

export interface EdDSAPCDArgs {
  privateKey: StringArgument;
  message: StringArrayArgument;
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

const fromHexString = (hexString: string) => {
  const byteStr = hexString.match(/.{1,2}/g);
  if (!byteStr) {
    throw new Error("Invalid hex string");
  }
  return Uint8Array.from(byteStr.map((byte) => parseInt(byte, 16)));
};

const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

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

  const eddsa = await buildEddsa();
  const poseidon = await buildPoseidon();

  const hashedMessage = poseidon(message);
  const publicKey = eddsa.prv2pub(prvKey);
  const signature = toHexString(
    eddsa.packSignature(eddsa.signPoseidon(prvKey, hashedMessage))
  );

  return new EdDSAPCD(id, { message }, { signature, publicKey });
}

export async function verify(pcd: EdDSAPCD): Promise<boolean> {
  const eddsa = await buildEddsa();
  const poseidon = await buildPoseidon();

  const signature = eddsa.unpackSignature(fromHexString(pcd.proof.signature));
  const pubKey = pcd.proof.publicKey;
  const hashedMessage = poseidon(pcd.claim.message);

  return eddsa.verifyPoseidon(hashedMessage, signature, pubKey);
}
