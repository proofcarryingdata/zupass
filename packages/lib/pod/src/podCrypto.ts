import { fromHexString, toHexString } from "@pcd/util";
import { Point, packPoint, unpackPoint } from "@zk-kit/baby-jubjub";
import {
  Signature,
  derivePublicKey,
  signMessage,
  verifySignature as zkkVerifySignature
} from "@zk-kit/eddsa-poseidon";
import {
  BigNumber,
  bigNumberishToBigInt,
  leBigIntToBuffer,
  leBufferToBigInt
} from "@zk-kit/utils";
import { sha256 } from "js-sha256";
import { poseidon1 } from "poseidon-lite/poseidon1";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { PODValue } from "./podTypes";
import {
  checkPrivateKeyFormat,
  checkPublicKeyFormat,
  checkSignatureFormat
} from "./podUtil";

function podStringHash(input: string): bigint {
  // TODO(artwyman): Finalize choice of hash for POD names and string values.
  return BigInt("0x" + sha256(input)) >> 8n;
}

function podIntHash(input: bigint): bigint {
  // TODO(artwyman): Finalize choice of hash for POD integer values.
  return poseidon1([input]);
}

export function podNameHash(podName: string): bigint {
  return podStringHash(podName);
}

export function podValueHash(podValue: PODValue): bigint {
  switch (podValue.type) {
    case "string":
      return podStringHash(podValue.value);
    case "int":
    case "cryptographic":
      // TODO(artwyman): Finalize choice of hash for POD cryptographics.
      return podIntHash(podValue.value);
  }
}

export function podMerkleTreeHash(left: bigint, right: bigint): bigint {
  return poseidon2([left, right]);
}

// TODO(artwyman): Submit this to zk-kit/eddsa-poseidon
export function packSignature(rawSignature: Signature): string {
  const numericSignature: Signature<bigint> = {
    R8: rawSignature.R8.map((c) => bigNumberishToBigInt(c)) as Point<bigint>,
    S: bigNumberishToBigInt(rawSignature.S)
  };
  const packedR8 = packPoint(numericSignature.R8);
  const packedBytes = Buffer.alloc(64);
  packedBytes.set(leBigIntToBuffer(packedR8), 0);
  packedBytes.set(leBigIntToBuffer(numericSignature.S), 32);
  return toHexString(packedBytes);
}

// TODO(artwyman): Submit this to zk-kit/eddsa-poseidon
export function unpackSignature(packedSigHex: string): Signature<bigint> {
  const packedBytes = Buffer.from(checkSignatureFormat(packedSigHex), "hex");
  const sliceR8 = packedBytes.subarray(0, 32);
  const sliceS = packedBytes.subarray(32, 64);
  const unpackedR8 = unpackPoint(leBufferToBigInt(sliceR8));
  if (unpackedR8 === null) {
    throw new Error(`Invalid packed signature point ${toHexString(sliceS)}.`);
  }
  return {
    R8: unpackedR8,
    S: leBufferToBigInt(sliceS)
  };
}

// TODO(artwyman): Decide whether to use zk-kit/eddsa-poseidon's packPublicKey,
// which uses a decimal format rather than hex.
export function packPublicKey(unpackedPublicKey: Point<BigNumber>): string {
  const numericPublicKey = [
    BigInt(unpackedPublicKey[0]),
    BigInt(unpackedPublicKey[1])
  ] as Point<bigint>;
  return toHexString(leBigIntToBuffer(packPoint(numericPublicKey)));
}

// TODO(artwyman): Decide whetehr to use zk-kit/eddsa-poseidon's unpackPublicKey,
// which uses a decimal format rather than hex.
export function unpackPublicKey(packedPublicKey: string): Point<bigint> {
  const unpackedPublicKey = unpackPoint(
    leBufferToBigInt(fromHexString(checkPublicKeyFormat(packedPublicKey)))
  );
  if (unpackedPublicKey === null) {
    throw new Error(`Invalid packed public key point ${packedPublicKey}.`);
  }
  return unpackedPublicKey;
}

export function unpackPrivateKey(packedPrivateKey: string): Buffer {
  return fromHexString(checkPrivateKeyFormat(packedPrivateKey));
}

// TODO(artwyman): Decide whether to submit change to zk-kit/eddsa-poseidon's
// verifySignature, which insists on stringified bigints in Points.
export function verifySignature(
  message: bigint,
  signature: Signature<bigint>,
  publicKey: Point<bigint>
): boolean {
  const stringSignature = {
    R8: [
      signature.R8[0].toString(),
      signature.R8[1].toString()
    ] as Point<string>,
    S: signature.S.toString()
  };
  const stringPublicKey: Point<string> = [
    publicKey[0].toString(),
    publicKey[1].toString()
  ];
  return zkkVerifySignature(message, stringSignature, stringPublicKey);
}

export function signPODRoot(
  root: bigint,
  privateKey: string
): { signature: string; publicKey: string } {
  const privateKeyBytes = unpackPrivateKey(privateKey);

  const unpackedSignature = signMessage(privateKeyBytes, root);
  const signature = packSignature(unpackedSignature);

  const unpackedPublicKey = derivePublicKey(privateKeyBytes);
  const publicKey = packPublicKey(unpackedPublicKey);

  return { signature, publicKey };
}

export function verifyPODRootSignature(
  root: bigint,
  signature: string,
  publicKey: string
): boolean {
  const unpackedPublicKey = unpackPublicKey(publicKey);
  const unpackedSignature = unpackSignature(signature);
  return verifySignature(root, unpackedSignature, unpackedPublicKey);
}
