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

/**
 * Calculates the appropriate hash for a POD value represented as a string,
 * which could be one of multiple value types (see {@link podValueHash}).
 */
function podStringHash(input: string): bigint {
  // TODO(artwyman): Finalize choice of hash for POD names and string values.
  return BigInt("0x" + sha256(input)) >> 8n;
}

/**
 * Calculates the appropriate hash for a POD value represented as an integer,
 * which could be one of multiple value types (see {@link podValueHash}).
 */
function podIntHash(input: bigint): bigint {
  // TODO(artwyman): Finalize choice of hash for POD integer values.
  return poseidon1([input]);
}

/**
 * Calculates the appropriate hash for a POD entry name.
 */
export function podNameHash(podName: string): bigint {
  return podStringHash(podName);
}

/**
 * Calculates the appropriate hash for a POD value of any type.
 */
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

/**
 * The hash function used to generate interior nodes in the Merkle tree
 * representing a POD.  The inputs may be value hashes, or other inner
 * nodes.
 */
export function podMerkleTreeHash(left: bigint, right: bigint): bigint {
  return poseidon2([left, right]);
}

/**
 * Packs an EdDSA signature into a compact string representation.
 * The output is 64 bytes, represented as 128 hex digits.
 */
// TODO(artwyman): Switch to zk-kit's version once it's released.
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

/**
 * Unpacks a signature produced by {@link packSignature}.
 */
// TODO(artwyman): Switch to zk-kit's version once it's released.
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

/**
 * Packs an EdDSA public key into a compact string represenation.  The output
 * is 32 bytes, represented as 64 hex digits.
 */
// TODO(artwyman): Update to zk-kit's version when it returns bigint instead of decimal string.
export function packPublicKey(unpackedPublicKey: Point<BigNumber>): string {
  const numericPublicKey = [
    BigInt(unpackedPublicKey[0]),
    BigInt(unpackedPublicKey[1])
  ] as Point<bigint>;
  return toHexString(leBigIntToBuffer(packPoint(numericPublicKey)));
}

/**
 * Unpacks a public key packed by {@packPublicKey}.
 */
// TODO(artwyman): Update to zk-kit's version when it returns bigint instead of decimal string.
export function unpackPublicKey(packedPublicKey: string): Point<bigint> {
  const unpackedPublicKey = unpackPoint(
    leBufferToBigInt(fromHexString(checkPublicKeyFormat(packedPublicKey)))
  );
  if (unpackedPublicKey === null) {
    throw new Error(`Invalid packed public key point ${packedPublicKey}.`);
  }
  return unpackedPublicKey;
}

/**
 * Unpacks a private key's bytes from a string.  The input must be 32 bytes,
 * expressed as 64 hex digits.
 */
export function unpackPrivateKey(packedPrivateKey: string): Buffer {
  return fromHexString(checkPrivateKeyFormat(packedPrivateKey));
}

/**
 * Verify an EdDSA signature.
 */
// TODO(artwyman): Update to zk-kit's version when it returns bigint instead of decimal string.
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

/**
 * Signs a POD.
 *
 * @param root the root hash (content ID) of the POD.
 * @param privateKey the signer's private key, which is 32 bytes encoded as
 *   64 hex digits.
 * @returns The signature as well as the signer's public key for inclusion
 *   in the POD.  The signature is 64 bytes encoded as 128 hex digits, while
 *   the public key is 32 bytes encoded as 64 hex digits.
 */
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

/**
 * Verifies the signature of a POD.
 *
 * @param root the root hash (content ID) of the POD.
 * @param signature the signature in packed form, which is 64 bytes expressed
 *   as 128 hex digits.
 * @param publicKey the signer's public key in packed form, which is 32 bytes
 *   expressed as 64 hex digits
 * @returns `true` if the signature is valid
 */
export function verifyPODRootSignature(
  root: bigint,
  signature: string,
  publicKey: string
): boolean {
  const unpackedPublicKey = unpackPublicKey(publicKey);
  const unpackedSignature = unpackSignature(signature);
  return verifySignature(root, unpackedSignature, unpackedPublicKey);
}
