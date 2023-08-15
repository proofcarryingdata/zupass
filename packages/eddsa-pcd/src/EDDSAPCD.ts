import {
  PCD,
  StringArgument,
  StringArrayArgument
} from "@pcd/pcd-types";
import { v4 as uuid } from "uuid";
import { buildEddsa } from "circomlibjs";
import { Scalar } from "ffjavascript";

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="util/declarations/circomlibjs.d.ts" />

export const EdDSAPCDTypeName = "eddsa-pcd";

export interface EdDSAPCDArgs {
  privateKey: StringArgument;
  message: StringArrayArgument;
  id: StringArgument;
}

export interface EdDSAPCDClaim {
  message: string[];
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

function mergeArrays(arrays: Uint8Array[]) {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

const fromHexString = (hexString: string) => {
  return new Uint8Array(
    // @ts-ignore
    hexString?.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );
};

const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

function messageToUint8Array(message: string[]): Uint8Array {
  const buffers: Uint8Array[] = message.map(fromHexString);

  const msgBuf = mergeArrays(buffers); 
  const paddedMsgBuf = mergeArrays([msgBuf, (new Uint8Array(4 - (msgBuf.length % 4))).fill(0)]);

  return paddedMsgBuf;
}

export async function prove(args: EdDSAPCDArgs): Promise<EdDSAPCD> {
  if (!args.privateKey.value) {
    throw new Error("No private key value provided");
  }

  if (!args.message.value) {
    throw new Error("No message value provided");
  }

  const id = typeof args.id.value === "string" ? args.id.value : uuid();

  const prvKey = Buffer.from(args.privateKey.value, "hex");

  const paddedMsgBuf = messageToUint8Array(args.message.value);

  const eddsa = await buildEddsa();

  const msg = eddsa.babyJub.F.e(Scalar.fromRprLE(paddedMsgBuf, 0));
  const publicKey = eddsa.prv2pub(prvKey);
  const signature = toHexString(
    eddsa.packSignature(eddsa.signPoseidon(prvKey, msg))
  );
  console.log("proving", msg, signature, publicKey);

  return new EdDSAPCD(id, { message: args.message.value }, { signature, publicKey });
}

export async function verify(pcd: EdDSAPCD): Promise<boolean> {
  const eddsa = await buildEddsa();

  const signature = eddsa.unpackSignature(fromHexString(pcd.proof.signature));
  const pubKey = pcd.proof.publicKey;
  const paddedMsgBuf =   messageToUint8Array(pcd.claim.message);
  const msg = eddsa.babyJub.F.e(Scalar.fromRprLE(paddedMsgBuf, 0));

  console.log("verifying", msg, signature, pubKey);
  
  return eddsa.verifyPoseidon(
    msg,
    signature,
    pubKey
  );
}
