import { fromHexString, toHexString } from "@pcd/util";
import { Point } from "@zk-kit/baby-jubjub";
import {
  Signature,
  derivePublicKey,
  packPublicKey,
  packSignature,
  signMessage,
  unpackPublicKey,
  unpackSignature,
  verifySignature
} from "@zk-kit/eddsa-poseidon";
import { BigNumber, leBigIntToBuffer, leBufferToBigInt } from "@zk-kit/utils";
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
  // TODO(POD-P2): Finalize choice of hash for POD names and string values.
  return BigInt("0x" + sha256(input)) >> 8n;
}

/**
 * Calculates the appropriate hash for a POD value represented as an integer,
 * which could be one of multiple value types (see {@link podValueHash}).
 */
function podIntHash(input: bigint): bigint {
  // TODO(POD-P2): Finalize choice of hash for POD integer values.
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
      // TODO(POD-P2): Finalize choice of hash for POD cryptographics.
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
 * Encodes an EdDSA signature into a compact string representation.
 * The output is 64 bytes, represented as 128 hex digits.
 */
export function encodeSignature(rawSignature: Signature): string {
  return toHexString(packSignature(rawSignature));
}

/**
 * Decodes a signature produced by {@link encodeSignature}.  The input must be
 * 64 bytes, represented as 128 hex digits.
 *
 * @throws TypeError if the signature format is incorrect
 */
export function decodeSignature(encodedSignature: string): Signature<bigint> {
  return unpackSignature(fromHexString(checkSignatureFormat(encodedSignature)));
}

/**
 * Encodes an EdDSA public key into a compact string represenation.  The output
 * is 32 bytes, represented as 64 hex digits.
 */
export function encodePublicKey(rawPublicKey: Point<BigNumber>): string {
  return toHexString(leBigIntToBuffer(packPublicKey(rawPublicKey), 32));
}

/**
 * Decodes a public key packed by {@encodePublicKey}.  The input must be
 * 32 bytes, represented as 64 hex digits.
 *
 * @throws TypeError if the public key format is incorrect.
 */
export function decodePublicKey(publicKey: string): Point<bigint> {
  const rawPublicKey = unpackPublicKey(
    leBufferToBigInt(fromHexString(checkPublicKeyFormat(publicKey)))
  );
  if (rawPublicKey === null) {
    throw new TypeError(`Invalid packed public key point ${publicKey}.`);
  }
  return rawPublicKey;
}

/**
 * Encodes a private key to a string.  The input must be 32 bytes.  The output
 * is represented as 64 hex digits.
 *
 * @throws TypeError if the size of the buffer is incorrect.
 */
export function encodePrivateKey(rawPrivateKey: Buffer): string {
  if (rawPrivateKey.length !== 32) {
    throw TypeError("Private key must be 32 bytes.");
  }
  return toHexString(rawPrivateKey);
}

/**
 * Decodes a private key's bytes from a string.  The input must be 32 bytes,
 * expressed as 64 hex digits.
 *
 * @throws TypeError if the private key format is incorrect.
 */
export function decodePrivateKey(privateKey: string): Buffer {
  return fromHexString(checkPrivateKeyFormat(privateKey));
}

/**
 * Signs a POD's root hash.
 *
 * @param root the root hash (content ID) of the POD.
 * @param privateKey the signer's private key, which is 32 bytes encoded as
 *   64 hex digits.
 * @returns The signature as well as the signer's public key for inclusion
 *   in the POD.  The signature is 64 bytes encoded as 128 hex digits, while
 *   the public key is 32 bytes encoded as 64 hex digits.
 * @throws TypeError if any of the individual arguments is incorrectly formatted
 */
export function signPODRoot(
  root: bigint,
  privateKey: string
): { signature: string; publicKey: string } {
  const privateKeyBytes = decodePrivateKey(privateKey);

  const unpackedSignature = signMessage(privateKeyBytes, root);
  const signature = encodeSignature(unpackedSignature);

  const unpackedPublicKey = derivePublicKey(privateKeyBytes);
  const publicKey = encodePublicKey(unpackedPublicKey);

  return { signature, publicKey };
}

/**
 * Verifies the signature of a POD root hash.
 *
 * @param root the root hash (content ID) of the POD.
 * @param signature the signature in packed form, which is 64 bytes expressed
 *   as 128 hex digits.
 * @param publicKey the signer's public key in packed form, which is 32 bytes
 *   expressed as 64 hex digits
 * @returns `true` if the signature is valid
 * @throws TypeError if any of the individual arguments incorrectly formatted
 */
export function verifyPODRootSignature(
  root: bigint,
  signature: string,
  publicKey: string
): boolean {
  const unpackedPublicKey = decodePublicKey(publicKey);
  const unpackedSignature = decodeSignature(signature);
  return verifySignature(root, unpackedSignature, unpackedPublicKey);
}
