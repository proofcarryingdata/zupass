import { fromHexString, toHexString } from "@pcd/util";
import {
  Point,
  packPoint as zkkPackPoint,
  unpackPoint as zkkUnpackPoint
} from "@zk-kit/baby-jubjub";
import {
  Signature,
  derivePublicKey,
  signMessage,
  verifySignature
} from "@zk-kit/eddsa-poseidon";
import { LeanIMT, LeanIMTMerkleProof } from "@zk-kit/imt";
import {
  BigNumber,
  bigNumberishToBigint,
  leBigintToBuffer,
  leBufferToBigint
} from "@zk-kit/utils";
import assert from "assert";
import { sha256 } from "js-sha256";
import { poseidon1 } from "poseidon-lite/poseidon1";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { PODEntries, PODMap, PODValue } from "./pod";
import { makePODMap } from "./podUtil";

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

export function merklizePOD(entries: PODEntries): {
  podMap: PODMap;
  merkleTree: LeanIMT<bigint>;
} {
  const podMap = makePODMap(entries);
  const merkleTree = new LeanIMT<bigint>((a, b) => poseidon2([a, b]));
  const hashes: bigint[] = [];
  for (const [podName, podValue] of podMap.entries()) {
    hashes.push(podNameHash(podName));
    hashes.push(podValueHash(podValue));
  }
  assert.equal(hashes.length, podMap.size * 2);
  merkleTree.insertMany(hashes);
  assert.equal(merkleTree.size, hashes.length);
  return { podMap, merkleTree };
}

export function packPoint(unpackedPoint: Point<BigNumber>): bigint {
  const zkkPackedPoint = zkkPackPoint([
    BigInt(unpackedPoint[0]),
    BigInt(unpackedPoint[1])
  ]);
  // zk-kit/baby-jubjub's packPoint reverses byte order when compared to
  // the raw point (and compared to circomlibjs).  Reverse it back manually.
  // TODO(artwyman): See if this is going to be fixed in zk-kit/baby-jubjub
  return leBufferToBigint(leBigintToBuffer(zkkPackedPoint).reverse());
}

export function unpackPoint(packedPoint: BigNumber): Point<bigint> | null {
  // zk-kit/baby-jubjub's packPoint reverses byte order when compared to
  // the raw point (and compared to circomlibjs).  Reverse it back manually.
  // TODO(artwyman): See if this is going to be fixed in zk-kit/baby-jubjub
  const zkkPackedPoint = leBufferToBigint(
    leBigintToBuffer(BigInt(packedPoint)).reverse()
  );
  const unpackedPoint = zkkUnpackPoint(zkkPackedPoint);
  return unpackedPoint;
}

// TODO(artwyman): Submit this to zk-kit/eddsa-poseidon
export function packSignature(rawSignature: Signature): Buffer {
  const numericSignature: Signature<bigint> = {
    R8: rawSignature.R8.map((c) => bigNumberishToBigint(c)) as Point<bigint>,
    S: bigNumberishToBigint(rawSignature.S)
  };
  const packedR8 = packPoint(numericSignature.R8);
  const packedBytes = Buffer.alloc(64);
  packedBytes.set(leBigintToBuffer(packedR8), 0);
  packedBytes.set(leBigintToBuffer(numericSignature.S), 32);
  return packedBytes;
}

// TODO(artwyman): Submit this to zk-kit/eddsa-poseidon
export function unpackSignature(packedSigHex: string): Signature<bigint> {
  const packedBytes = Buffer.from(packedSigHex, "hex");
  const sliceR8 = packedBytes.subarray(0, 32);
  const sliceS = packedBytes.subarray(32, 64);
  const unpackedR8 = unpackPoint(leBufferToBigint(sliceR8));
  if (unpackedR8 === null) {
    throw new Error(`Invalid packed signature point ${toHexString(sliceS)}.`);
  }
  return {
    R8: unpackedR8,
    S: leBufferToBigint(sliceS)
  };
}

// TODO(artwyman): Decide whether to use zk-kit/eddsa-poseidon's packPublicKey,
// which uses a decimal format.
export function packPublicKey(unpackedPublicKey: Point<BigNumber>): string {
  return toHexString(leBigintToBuffer(packPoint(unpackedPublicKey)));
}

// TODO(artwyman): Decide whetehr to use zk-kit/eddsa-poseidon's unpackPublicKey,
// which uses a decimal format.
export function unpackPublicKey(packedPublicKey: string): Point<bigint> {
  const unpackedPublicKey = unpackPoint(
    leBufferToBigint(fromHexString(packedPublicKey))
  );
  if (unpackedPublicKey === null) {
    throw new Error(`Invalid packed public key point ${packedPublicKey}.`);
  }
  return unpackedPublicKey;
}

export function signPODRoot(
  root: bigint,
  privateKey: string
): { signature: string; publicKey: string } {
  // TODO(artwyman): ART_IMPL EdDSA signature
  const privateKeyBytes = fromHexString(privateKey);
  const signature = toHexString(
    packSignature(signMessage(privateKeyBytes, root))
  );
  const publicKey = packPublicKey(derivePublicKey(privateKeyBytes));

  return { signature, publicKey };
}

export function verifyPODRootSignature(
  root: bigint,
  signature: string,
  publicKey: string
): boolean {
  const unpackedPublicKey = unpackPoint(
    leBufferToBigint(fromHexString(publicKey))
  );
  if (unpackedPublicKey === null) {
    throw new Error(`Invalid packed public key point ${publicKey}.`);
  }
  const unpackedSignature = unpackSignature(signature);
  return verifySignature(root, unpackedSignature, unpackedPublicKey);
}

export function signPOD(
  entries: PODEntries,
  privateKey: string
): {
  podMap: PODMap;
  merkleTree: LeanIMT<bigint>;
  signature: string;
  publicKey: string;
} {
  const { podMap, merkleTree } = merklizePOD(entries);
  const { signature, publicKey } = signPODRoot(merkleTree.root, privateKey);
  return { podMap, merkleTree, signature, publicKey };
}

export function verifyPOD(
  entries: PODEntries,
  signature: string,
  publicKey: string
): boolean {
  const { podMap: _, merkleTree } = merklizePOD(entries);
  return verifyPODRootSignature(merkleTree.root, signature, publicKey);
}

export function getPODEntryIndex(podMap: PODMap, entryName: string): number {
  const index = [...podMap.keys()].indexOf(entryName);
  if (index < 0) {
    throw new Error(`POD doesn't contain entry ${entryName}.`);
  }
  return index;
}

export function generatePODMerkleProof(
  podMap: PODMap,
  merkleTree: LeanIMT<bigint>,
  entryName: string
): LeanIMTMerkleProof<bigint> {
  return merkleTree.generateProof(getPODEntryIndex(podMap, entryName) * 2);
}

export function verifyPODMerkeProof(
  entryProof: LeanIMTMerkleProof<bigint>
): boolean {
  // TODO(artwyman): LeanIMT.verifyProof doesn't need the tree, just the hash
  return new LeanIMT<bigint>((a, b) => poseidon2([a, b])).verifyProof(
    entryProof
  );
}
