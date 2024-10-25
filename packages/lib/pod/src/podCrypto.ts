import { Point } from "@zk-kit/baby-jubjub";
import {
  derivePublicKey,
  packPublicKey,
  packSignature,
  Signature,
  signMessage,
  unpackPublicKey,
  unpackSignature,
  verifySignature
} from "@zk-kit/eddsa-poseidon";
import { BigNumber, leBigIntToBuffer, leBufferToBigInt } from "@zk-kit/utils";
import { sha256 } from "js-sha256";
import { poseidon1 } from "poseidon-lite/poseidon1";
import { poseidon2 } from "poseidon-lite/poseidon2";
import {
  PRIVATE_KEY_REGEX,
  PUBLIC_KEY_ENCODING_GROUPS,
  PUBLIC_KEY_REGEX,
  SIGNATURE_ENCODING_GROUPS,
  SIGNATURE_REGEX
} from "./podChecks";
import { EDDSA_PUBKEY_TYPE_STRING, POD_NULL_HASH, PODValue } from "./podTypes";
import { CryptoBytesEncoding, decodeBytesAuto, encodeBytes } from "./podUtil";

/**
 * Calculates the appropriate hash for a POD value represented as a string or
 * bytes, which could be one of multiple value types (see {@link podValueHash}).
 */
export function podBytesHash(input: string | Uint8Array): bigint {
  return BigInt("0x" + sha256(input)) >> 8n;
}

/**
 * Calculates the appropriate hash for a POD value represented as an integer,
 * which could be one of multiple value types (see {@link podValueHash}).
 */
export function podIntHash(input: bigint): bigint {
  return poseidon1([input]);
}

/**
 * Calculates the appropriate hash for a POD value represented as a string-encoded EdDSA public key.
 */
export function podEdDSAPublicKeyHash(input: string): bigint {
  return poseidon2(decodePublicKey(input));
}

/**
 * Calculates the appropriate hash for a POD entry name.
 */
export function podNameHash(podName: string): bigint {
  return podBytesHash(podName);
}

/**
 * Calculates the appropriate hash for a POD value of any type.
 */
export function podValueHash(podValue: PODValue): bigint {
  switch (podValue.type) {
    case "string":
    case "bytes":
      return podBytesHash(podValue.value);
    case "int":
    case "cryptographic":
      return podIntHash(podValue.value);
    case "boolean":
      return podIntHash(podValue.value ? 1n : 0n);
    case EDDSA_PUBKEY_TYPE_STRING:
      return podEdDSAPublicKeyHash(podValue.value);
    case "date":
      return podIntHash(BigInt(podValue.value.getTime()));
    case "null":
      return POD_NULL_HASH;
    default:
      throw new TypeError(`Unexpected type in PODValue ${podValue}.`);
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
 * Encodes a private key to a string.  The input must be 32 bytes.  The output
 * is represented as unpadded Base64 by default.
 *
 * @param rawPrivateKey the private key bytes
 * @param encoding one of the supported encodings to use, as per
 *   {@link encodeBytes}.
 * @throws TypeError if the size of the buffer is incorrect.
 */
export function encodePrivateKey(
  rawPrivateKey: Uint8Array,
  encoding: CryptoBytesEncoding = "base64"
): string {
  if (!((rawPrivateKey as unknown) instanceof Uint8Array)) {
    throw TypeError("Private key must be Buffer or Uint8Array.");
  }
  if (rawPrivateKey.length !== 32) {
    throw TypeError("Private key must be a 32 bytes.");
  }
  return encodeBytes(rawPrivateKey, encoding);
}

/**
 * Decodes a private key's bytes from a string.  The input must be 32 bytes,
 * represented as hex or Base64.  Base64 padding is optional.
 *
 * @param privateKey the private key string to decode
 * @throws TypeError if the private key format is incorrect.
 */
export function decodePrivateKey(privateKey: string): Buffer {
  return decodeBytesAuto(
    privateKey,
    PRIVATE_KEY_REGEX,
    PUBLIC_KEY_ENCODING_GROUPS,
    "Private key should be 32 bytes, encoded as hex or Base64."
  );
}

/**
 * Encodes an EdDSA public key into a compact string represenation.  The output
 * is 32 bytes, represented as unpadded Base64 by default.
 *
 * @param rawPublicKey the EdDSA public key to encode
 * @param encoding one of the supported encodings to use
 */
export function encodePublicKey(
  rawPublicKey: Point<BigNumber>,
  encoding: CryptoBytesEncoding = "base64"
): string {
  return encodeBytes(
    leBigIntToBuffer(packPublicKey(rawPublicKey), 32),
    encoding
  );
}

/**
 * Decodes a public key packed by {@encodePublicKey}.  The input must be
 * 32 bytes, represented as hex or Base64.  Base64 padding is optional.
 *
 * @param publicKey the public key string to decode
 * @throws TypeError if the public key format is incorrect.
 */
export function decodePublicKey(publicKey: string): Point<bigint> {
  const rawPublicKey = unpackPublicKey(
    leBufferToBigInt(
      decodeBytesAuto(
        publicKey,
        PUBLIC_KEY_REGEX,
        PUBLIC_KEY_ENCODING_GROUPS,
        "Public key should be 32 bytes, encoded as hex or Base64."
      )
    )
  );
  if (rawPublicKey === null) {
    throw new TypeError(`Invalid packed public key point ${publicKey}.`);
  }
  return rawPublicKey;
}

/**
 * Encodes an EdDSA signature into a compact string representation.
 * The output is represented in unpadded Base64 by default.
 *
 * @param rawSignature the EdDSA signature to encode
 * @param encoding one of the supported encodings to use
 */
export function encodeSignature(
  rawSignature: Signature,
  encoding: CryptoBytesEncoding = "base64"
): string {
  return encodeBytes(packSignature(rawSignature), encoding);
}

/**
 * Decodes a signature produced by {@link encodeSignature}.  The input must be
 * 64 bytes, represented as hex or Base64.  Base64 padding is optional.
 *
 * @param encodedSignature the signature string to decode
 * @throws TypeError if the signature format is incorrect
 */
export function decodeSignature(encodedSignature: string): Signature<bigint> {
  return unpackSignature(
    decodeBytesAuto(
      encodedSignature,
      SIGNATURE_REGEX,
      SIGNATURE_ENCODING_GROUPS,
      "Signature should be 64 bytes, encoded as hex or Base64."
    )
  );
}

/**
 * Calculates the corresponding public key for the given private key.  This is
 * equivalent to the calculation performed in {@link signPODRoot}, and can be
 * used to pre-publish the expected public key to clients before signing.
 *
 * @param privateKey the signer's private key, which is 32 bytes encoded as
 *   per {@link encodePrivateKey}.
 * @returns The signer's public key, which is 32 bytes encoded as per
 *   {@link encodePublicKey}.
 * @throws TypeError if any of the individual arguments is incorrectly formatted
 */
export function deriveSignerPublicKey(privateKey: string): string {
  const privateKeyBytes = decodePrivateKey(privateKey);
  const unpackedPublicKey = derivePublicKey(privateKeyBytes);
  return encodePublicKey(unpackedPublicKey);
}

/**
 * Signs a POD's root hash.
 *
 * @param root the root hash (content ID) of the POD.
 * @param privateKey the signer's private key, which is 32 bytes encoded as
 *   per {@link encodePrivateKey}.
 * @returns The signature as well as the signer's public key for inclusion
 *   in the POD.  The signature is 64 bytes represented in unpadded Base64.
 * @throws TypeError if any of the individual arguments is incorrectly formatted
 */
export function signPODRoot(
  root: bigint,
  privateKey: string
): { signature: string; publicKey: string } {
  if (typeof root !== "bigint") {
    throw new TypeError("POD root must be a bigint not `${typeof root}`.");
  }

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
 * @param signature the signature in packed form, which is 64 bytes represented
 *   in hex or Base64.  Base64 padding is optional.
 * @param publicKey the signer's public key in packed form, which is 32 bytes
 *   represented in hex or Base64.  Base64 padding is optional.
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
